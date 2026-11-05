// Tests for _lib/uploadImages.js: the retries and their pauses, no retry on a 4xx, at most 3
// uploads at once, the uploads kept when another fails, and the Sentry report of a failure.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/browser";
import { uploadPicked } from "./uploadImages";
import { initSentry } from "./sentry";
import { deferred, imageFile, mockFetch } from "../../test/helpers";

const DSN = "https://publickey@o123.ingest.us.sentry.io/456";
const FOLDER_URL =
  "https://res.cloudinary.com/demo/image/upload/v1792541844/3dwd-dev/steviethedog";
const UPLOAD_URL = "https://api.cloudinary.com/v1_1/demo/image/upload";
const SIGNATURE = {
  uploadUrl: UPLOAD_URL,
  fields: { folder: "3dwd-dev/steviethedog", signature: "0a1b2c" },
};
const REFUSED = {
  status: 400,
  body: { error: { message: "Image file format gif not allowed" } },
};

// Cloudinary's answer for the file named `name`.
function stored(name) {
  return {
    body: {
      secure_url: `${FOLDER_URL}/${name}`,
      width: 2500,
      height: 1875,
    },
  };
}

// A form's picked images, one per name, each with its object URL as src. jsdom can't shrink a
// file, so each goes up as picked, under its own name.
function picked(...names) {
  return names.map((name) => ({ src: `blob:${name}`, file: imageFile(name) }));
}

// The sign endpoint and Cloudinary, which answers each file by its name: answers[name] is a
// mockFetch route (or a promise of one, to hold it back), or a list answered in order for that
// file's tries. Returns the upload calls
// made so far, as a list that grows as more are made.
function mockUploads(answers) {
  const tries = {};
  const uploads = [];
  mockFetch({
    "POST /api/siteOwner/uploads/sign": { body: { data: SIGNATURE } },
    [`POST ${UPLOAD_URL}`]: (call) => {
      uploads.push(call);
      const { name } = call.body.file;
      const answer = answers[name];
      if (!Array.isArray(answer)) return answer;
      tries[name] = (tries[name] ?? 0) + 1;
      return answer[Math.min(tries[name], answer.length) - 1];
    },
  });
  return uploads;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout"] });
});

afterEach(async () => {
  vi.useRealTimers();
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
  vi.unstubAllEnvs();
});

describe("uploadPicked", () => {
  it("retries a network failure after 1s and a 5xx after 3s, then keeps the upload with no error", async () => {
    const uploads = mockUploads({
      "a.jpg": [{ networkError: true }, { status: 503 }, stored("a.jpg")],
    });

    const pending = uploadPicked("w1", picked("a.jpg"), vi.fn());
    await vi.advanceTimersByTimeAsync(999);
    expect(uploads).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(uploads).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(2999);
    expect(uploads).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    const { storedBySrc, error } = await pending;

    expect(uploads).toHaveLength(3);
    expect(error).toBeNull();
    expect(storedBySrc.get("blob:a.jpg")).toEqual({
      src: `${FOLDER_URL}/a.jpg`,
      width: 2500,
      height: 1875,
    });
  });

  it("never retries a 4xx", async () => {
    const uploads = mockUploads({ "a.jpg": REFUSED });

    const { storedBySrc, error } = await uploadPicked(
      "w1",
      picked("a.jpg"),
      vi.fn(),
    );

    expect(uploads).toHaveLength(1);
    expect(storedBySrc.size).toBe(0);
    expect(error.message).toBe(
      "Your images couldn't be uploaded, please try again.",
    );
  });

  it("gives up on a photo after 3 tries and keeps the others, saying how many failed", async () => {
    const uploads = mockUploads({
      "a.jpg": stored("a.jpg"),
      "b.jpg": { networkError: true },
      "c.jpg": stored("c.jpg"),
    });

    const pending = uploadPicked(
      "w1",
      picked("a.jpg", "b.jpg", "c.jpg"),
      vi.fn(),
    );
    await vi.advanceTimersByTimeAsync(4000);
    const { storedBySrc, error } = await pending;

    expect(
      uploads.filter((call) => call.body.file.name === "b.jpg"),
    ).toHaveLength(3);
    expect([...storedBySrc.keys()]).toEqual(["blob:a.jpg", "blob:c.jpg"]);
    expect(error.message).toBe(
      "1 of your 3 images couldn't be uploaded. Press Submit to try it again.",
    );
  });

  it("says them when more than one photo failed", async () => {
    mockUploads({
      "a.jpg": stored("a.jpg"),
      "b.jpg": REFUSED,
      "c.jpg": REFUSED,
    });

    const { error } = await uploadPicked(
      "w1",
      picked("a.jpg", "b.jpg", "c.jpg"),
      vi.fn(),
    );

    expect(error.message).toBe(
      "2 of your 3 images couldn't be uploaded. Press Submit to try them again.",
    );
  });

  it("runs no more than 3 uploads at once, counting each stored photo", async () => {
    const held = {};
    const names = ["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg"];
    const uploads = mockUploads(
      Object.fromEntries(
        names.map((name) => {
          held[name] = deferred();
          return [name, held[name].promise];
        }),
      ),
    );
    const onProgress = vi.fn();

    const pending = uploadPicked("w1", picked(...names), onProgress);
    await vi.waitFor(() => expect(uploads).toHaveLength(3));
    held["a.jpg"].resolve(stored("a.jpg"));
    await vi.waitFor(() => expect(uploads).toHaveLength(4));
    expect(onProgress).toHaveBeenCalledWith("Uploading photos (1 of 5)…");
    for (const name of names.slice(1)) held[name].resolve(stored(name));
    const { storedBySrc, error } = await pending;

    expect(uploads).toHaveLength(5);
    expect(storedBySrc.size).toBe(5);
    expect(error).toBeNull();
    expect(onProgress).toHaveBeenLastCalledWith("Uploading photos (5 of 5)…");
  });

  it("reports a failure to Sentry with only its counts and reasons", async () => {
    // Sentry's flush waits on a real timer.
    vi.useRealTimers();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const events = [];
    initSentry({
      transport: () => ({
        send: async (envelope) => {
          for (const [itemHeader, payload] of envelope[1]) {
            if (itemHeader.type === "event") events.push(payload);
          }
          return {};
        },
        flush: async () => true,
      }),
    });
    mockUploads({ "a.jpg": stored("a.jpg"), "b.jpg": REFUSED });

    await uploadPicked("w1", picked("a.jpg", "b.jpg"), vi.fn());
    await Sentry.flush();

    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event.exception.values[0].value).toBe("Image upload failed");
    expect(event.tags).toEqual({
      uploadFailed: 1,
      uploadTotal: 2,
      uploadFailure: "status 400",
    });
    const sent = JSON.stringify(event);
    expect(sent).not.toContain("b.jpg");
    expect(sent).not.toContain("api.cloudinary.com");
    expect(sent).not.toContain("0a1b2c");
  });
});
