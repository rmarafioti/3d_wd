// Tests for PostForm, the Create a Post and Edit a Post form (docs/flows.md): the Website
// pre-select, the request payload (body elements in order, blank → null, image ids kept across a
// move, no client key), the one-paragraph rule, what Edit leaves out, backend errors including
// dropped element messages, image uploads on Publish (docs/api.md → Endpoints, Notes: one
// signature, each new file to Cloudinary, nothing saved if one fails, no second upload on a
// retry) and the 20-hour form timeout.

import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostForm, { postToFormValues } from "./PostForm";
import {
  deferred,
  imageFile,
  mockFetch,
  stubImageLoading,
  stubMatchMedia,
  stubObjectUrls,
} from "../../test/helpers";

// The Add buttons read "Add a / an …" with none of that type and "Add another …" once there is
// one; the exact label is tested on its own in PostBodyFields.test.jsx.
const ADD_PARAGRAPH = /^Add (a|another) paragraph$/;
const ADD_IMAGE = /^Add (an|another) image$/;

const STEVIE = { id: "w1", websiteName: "Stevie The Dog", posts: [] };
const GOOD_BOYS = { id: "w2", websiteName: "Good Boys", posts: [] };
const FOLDER_URL =
  "https://res.cloudinary.com/demo/image/upload/v1792541844/3dwd-dev/steviethedog";
const IMAGE = {
  id: "i1",
  src: `${FOLDER_URL}/stored0.jpg`,
  width: 800,
  height: 600,
  altText: "Stevie",
};
const POST = {
  id: "p1",
  websiteId: "w1",
  websiteName: "Stevie The Dog",
  postName: "Walk day",
  header: "A walk",
  subHeader: null,
  postDate: "2026-10-07",
  active: true,
  createdAt: "2026-10-07T00:00:00.000Z",
  updatedAt: "2026-10-07T00:00:00.000Z",
  body: [
    { type: "paragraph", text: "We went for a walk." },
    { type: "image", image: IMAGE },
  ],
};

// The UploadSignature the sign endpoint returns (docs/api.md → Shapes), with Cloudinary's own
// field names.
const UPLOAD_URL = "https://api.cloudinary.com/v1_1/demo/image/upload";
const SIGNATURE = {
  uploadUrl: UPLOAD_URL,
  fields: {
    allowed_formats: "jpg,jpeg,png,webp",
    folder: "3dwd-dev/steviethedog",
    timestamp: 1792541844,
    transformation: "c_limit,w_2500,h_2500",
    signature: "0a1b2c",
    api_key: "123456",
  },
};

// Cloudinary's answer for the nth upload: the stored image (it also sends fields we don't read).
function stored(n) {
  return {
    body: {
      secure_url: `${FOLDER_URL}/stored${n}.jpg`,
      width: 2500,
      height: 1875,
      public_id: `3dwd-dev/steviethedog/stored${n}`,
      format: "jpg",
    },
  };
}

// The sign endpoint and Cloudinary, answering uploads in order. Returns mockFetch's calls.
function mockUploads(uploads = [stored(1), stored(2)]) {
  return mockFetch({
    "POST /api/siteOwner/uploads/sign": { body: { data: SIGNATURE } },
    [`POST ${UPLOAD_URL}`]: uploads,
  }).calls;
}

function uploadCalls(calls) {
  return calls.filter((call) => call.path === UPLOAD_URL);
}

// Picks a file for the last image element and lets it load, then writes its alt text.
async function fillImage(user, loads, altText = "Stevie") {
  await user.upload(
    screen.getAllByLabelText("Image").at(-1),
    imageFile(`${altText}.jpg`),
  );
  loads.at(-1).load(4000, 3000);
  await user.type(screen.getAllByLabelText("Alt Text").at(-1), altText);
}

function renderCreate({ websites = [STEVIE], onSubmit = vi.fn() } = {}) {
  const onSuccess = vi.fn();
  const user = userEvent.setup();
  render(
    <PostForm
      mode="create"
      websites={websites}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      onClose={() => {}}
    />,
  );
  return { user, onSubmit, onSuccess };
}

function renderEdit({ post = POST, onSubmit = vi.fn() } = {}) {
  const onSuccess = vi.fn();
  const user = userEvent.setup();
  render(
    <PostForm
      mode="edit"
      websiteId={post.websiteId}
      websiteName={post.websiteName}
      initialValues={postToFormValues(post)}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      onClose={() => {}}
    />,
  );
  return { user, onSubmit, onSuccess };
}

describe("PostForm (create)", () => {
  it("pre-selects the website when the site owner has exactly one", () => {
    renderCreate();

    expect(screen.getByLabelText("Website")).toHaveDisplayValue(
      "Stevie The Dog",
    );
  });

  it("starts on the placeholder when there are several websites", () => {
    renderCreate({ websites: [STEVIE, GOOD_BOYS] });

    expect(screen.getByLabelText("Website")).toHaveDisplayValue(
      "Choose a website",
    );
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("sends the body in order, line breaks kept, blank optional fields as null, the Active toggle, and no client key", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    mockUploads();
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await user.type(screen.getByLabelText("Post Name"), "  Walk day ");
    await user.type(screen.getByLabelText("Header"), "   ");
    await user.type(
      screen.getByLabelText("Paragraph"),
      "  We went{Enter}for a walk. ",
    );
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads);
    await user.click(screen.getByRole("button", { name: ADD_PARAGRAPH }));
    await user.type(screen.getAllByLabelText("Paragraph")[1], "The end.");
    await user.click(screen.getByLabelText("Active"));

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      websiteId: "w1",
      postName: "Walk day",
      header: null,
      subHeader: null,
      postDate: null,
      active: false,
      body: [
        { type: "paragraph", text: "We went\nfor a walk." },
        {
          type: "image",
          image: {
            src: `${FOLDER_URL}/stored1.jpg`,
            width: 2500,
            height: 1875,
            altText: "Stevie",
          },
        },
        { type: "paragraph", text: "The end." },
      ],
    });
  });

  it("keeps Publish disabled while the body has no paragraph", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = renderCreate();
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Paragraph"), "Hi");
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads);
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();

    await user.click(
      screen.getByRole("button", { name: "Delete paragraph 1" }),
    );

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(
      screen.getByText("One paragraph is required to submit a post."),
    ).toBeInTheDocument();
  });

  it("keeps Publish disabled while an image is incomplete", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = renderCreate();
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Paragraph"), "Hi");
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads);
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();

    await user.clear(screen.getByLabelText("Alt Text"));

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("shows a backend error, its field messages next to fields, and keeps the input", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Please fix the highlighted fields.",
      fields: { postName: "Post name must be 100 characters or fewer." },
    });
    const { user, onSuccess } = renderCreate({ onSubmit });
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Paragraph"), "Hi");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText("Please fix the highlighted fields."),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Post Name").nextElementSibling,
    ).toHaveTextContent("Post name must be 100 characters or fewer.");
    expect(screen.getByLabelText("Post Name")).toHaveValue("Walk day");
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("PostForm (edit)", () => {
  it("pre-fills from the post with no Website select and no Active toggle", () => {
    renderEdit();

    expect(
      screen.getByRole("heading", { name: "Edit Post" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Website: Stevie The Dog")).toBeInTheDocument();
    expect(screen.queryByLabelText("Website")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Active")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Post Name")).toHaveValue("Walk day");
    expect(screen.getByLabelText("Sub Header")).toHaveValue("");
    expect(
      within(screen.getByRole("group", { name: "Body" })).getByRole("img", {
        name: "Stevie",
      }),
    ).toHaveAttribute("src", IMAGE.src);
  });

  it("sends the full form: a moved image keeps its id, formatting as typed, no websiteId or active", async () => {
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderEdit({ onSubmit });
    await user.click(screen.getByRole("button", { name: "Move image 1 up" }));
    await user.clear(screen.getByLabelText("Paragraph"));
    await user.type(
      screen.getByLabelText("Paragraph"),
      "We went for a **walk**.",
    );

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      postName: "Walk day",
      header: "A walk",
      subHeader: null,
      postDate: "2026-10-07",
      body: [
        {
          type: "image",
          image: {
            id: "i1",
            src: IMAGE.src,
            width: 800,
            height: 600,
            altText: "Stevie",
          },
        },
        { type: "paragraph", text: "We went for a **walk**." },
      ],
    });
  });

  it("leaves a deleted image out of the body", async () => {
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderEdit({ onSubmit });

    await user.click(screen.getByRole("button", { name: "Delete image 1" }));
    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].body).toEqual([
      { type: "paragraph", text: "We went for a walk." },
    ]);
  });

  it("drops the body's list-level server message once the body changes", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Please fix the highlighted fields.",
      fields: { body: "Add at least one paragraph." },
    });
    const { user } = renderEdit({ onSubmit });
    await user.click(screen.getByRole("button", { name: "Publish" }));
    await screen.findByText("Add at least one paragraph.");

    await user.click(screen.getByRole("button", { name: ADD_PARAGRAPH }));

    expect(
      screen.queryByText("Add at least one paragraph."),
    ).not.toBeInTheDocument();
  });

  it("drops element messages from the server once moving an element shifts the indexes", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Please fix the highlighted fields.",
      fields: {
        "body.1.image.altText": "Alt text must be 200 characters or fewer.",
      },
    });
    const { user } = renderEdit({ onSubmit });
    await user.click(screen.getByRole("button", { name: "Publish" }));
    await screen.findByText("Alt text must be 200 characters or fewer.");

    await user.click(screen.getByRole("button", { name: "Move image 1 up" }));

    expect(
      screen.queryByText("Alt text must be 200 characters or fewer."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Please fix the highlighted fields."),
    ).toBeInTheDocument();
  });
});

describe("PostForm image uploads", () => {
  async function fillPost(user) {
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Paragraph"), "Hi");
  }

  it("signs once for the post's website, uploads each new image to Cloudinary, then saves Cloudinary's src and size", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const calls = mockUploads();
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await fillPost(user);
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads, "Stevie");
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads, "Ball");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const [sign, ...uploads] = calls;
    expect(sign).toMatchObject({
      method: "POST",
      path: "/api/siteOwner/uploads/sign",
      credentials: "include",
      headers: { "X-CSRF-Protection": "1" },
      body: { websiteId: "w1" },
    });
    expect(uploads).toHaveLength(2);
    for (const upload of uploads) {
      expect(upload.credentials).toBeUndefined();
      expect(upload.headers).toEqual({});
      expect(upload.body).toEqual({
        ...SIGNATURE.fields,
        timestamp: "1792541844",
        file: expect.any(File),
      });
    }
    expect(uploads.map((upload) => upload.body.file.name)).toEqual([
      "Stevie.jpg",
      "Ball.jpg",
    ]);
    expect(onSubmit.mock.calls[0][0].body.slice(1)).toEqual([
      {
        type: "image",
        image: {
          src: `${FOLDER_URL}/stored1.jpg`,
          width: 2500,
          height: 1875,
          altText: "Stevie",
        },
      },
      {
        type: "image",
        image: {
          src: `${FOLDER_URL}/stored2.jpg`,
          width: 2500,
          height: 1875,
          altText: "Ball",
        },
      },
    ]);
  });

  it("shows a picked image in the preview from memory before anything is uploaded", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const calls = mockUploads();
    const { user } = renderCreate();
    await fillPost(user);
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));

    await fillImage(user, loads);

    const preview = screen.getByRole("region", { name: "Post preview" });
    expect(
      within(preview).getByRole("img", { name: "Stevie" }),
    ).toHaveAttribute("src", "blob:test/1");
    expect(calls).toHaveLength(0);
  });

  it("in Edit, uploads only the added image and keeps the existing one's id, src and size", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const calls = mockUploads();
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderEdit({ onSubmit });
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads, "Ball");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(calls[0].body).toEqual({ websiteId: "w1" });
    expect(uploadCalls(calls)).toHaveLength(1);
    expect(onSubmit.mock.calls[0][0].body.slice(1)).toEqual([
      { type: "image", image: IMAGE },
      {
        type: "image",
        image: {
          src: `${FOLDER_URL}/stored1.jpg`,
          width: 2500,
          height: 1875,
          altText: "Ball",
        },
      },
    ]);
  });

  it("sends no request before the save when the body has no new images", async () => {
    const calls = mockUploads();
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderEdit({ onSubmit });

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(calls).toHaveLength(0);
  });

  it.each([
    [
      "Cloudinary refuses it",
      {
        status: 400,
        body: { error: { message: "Image file format gif not allowed" } },
      },
    ],
    ["Cloudinary can't be reached", { networkError: true }],
  ])("saves nothing and keeps the form when %s", async (_, failure) => {
    const loads = stubImageLoading();
    stubObjectUrls();
    mockUploads([failure]);
    const onSubmit = vi.fn();
    const { user } = renderCreate({ onSubmit });
    await fillPost(user);
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText(
        "Your images couldn't be uploaded, please try again.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Image file format gif not allowed"),
    ).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Post Name")).toHaveValue("Walk day");
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  it("shows the sign endpoint's error and uploads nothing", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const calls = mockFetch({
      "POST /api/siteOwner/uploads/sign": {
        status: 404,
        body: { error: { message: "Website not found." } },
      },
    }).calls;
    const onSubmit = vi.fn();
    const { user } = renderCreate({ onSubmit });
    await fillPost(user);
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(await screen.findByText("Website not found.")).toBeInTheDocument();
    expect(uploadCalls(calls)).toHaveLength(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the upload-signing rate-limit message, uploads nothing and saves nothing", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const calls = mockFetch({
      "POST /api/siteOwner/uploads/sign": {
        status: 429,
        body: {
          error: { message: "Too many requests. Please try again later." },
        },
      },
    }).calls;
    const onSubmit = vi.fn();
    const { user } = renderCreate({ onSubmit });
    await fillPost(user);
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText("Too many requests. Please try again later."),
    ).toBeInTheDocument();
    expect(uploadCalls(calls)).toHaveLength(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("doesn't upload an image again when Publish is tried again after a failed save", async () => {
    const loads = stubImageLoading();
    const { revokeObjectURL } = stubObjectUrls();
    const calls = mockUploads();
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce({
        message: "Something went wrong, please try again.",
      })
      .mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await fillPost(user);
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads);
    await user.click(screen.getByRole("button", { name: "Publish" }));
    await screen.findByText("Something went wrong, please try again.");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(uploadCalls(calls)).toHaveLength(1);
    expect(onSubmit.mock.calls[1][0].body[1].image.src).toBe(
      `${FOLDER_URL}/stored1.jpg`,
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });

  it('reads "Uploading images…" on Publish while the images upload, then "Publishing…" while the post saves', async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const upload = deferred();
    mockUploads([() => upload.promise]);
    const save = deferred();
    const { user } = renderCreate({
      onSubmit: vi.fn().mockReturnValue(save.promise),
    });
    await fillPost(user);
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByRole("button", { name: "Uploading images…" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Uploading images…");
    await act(async () => upload.resolve(stored(1)));
    expect(
      await screen.findByRole("button", { name: "Publishing…" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Publishing…");
  });

  it('reads "Publishing…" on Publish while a post without images saves, and "Publish" again after a failure', async () => {
    const save = deferred();
    const { user } = renderCreate({
      onSubmit: vi.fn().mockReturnValue(save.promise),
    });
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Paragraph"), "Hi");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByRole("button", { name: "Publishing…" }),
    ).toBeDisabled();
    await act(async () =>
      save.reject({ message: "Something went wrong, please try again." }),
    );
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
    expect(
      screen.getByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("lets go of picked images' object URLs when the form closes", async () => {
    const loads = stubImageLoading();
    const { revokeObjectURL } = stubObjectUrls();
    const user = userEvent.setup();
    const { unmount } = render(
      <PostForm
        mode="create"
        websites={[STEVIE]}
        onSubmit={vi.fn()}
        onSuccess={vi.fn()}
        onClose={() => {}}
      />,
    );
    await fillPost(user);
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user, loads);

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });
});

describe("PostForm timeout", () => {
  const HOUR = 60 * 60 * 1000;

  it("clears the form with the timed-out message once it has been open for 20 hours", () => {
    vi.useFakeTimers();
    try {
      renderCreate();

      act(() => vi.advanceTimersByTime(20 * HOUR - 60 * 1000));
      expect(screen.getByLabelText("Post Name")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(60 * 1000));

      expect(
        screen.getByText(
          "This form was open for 20 hours, so it timed out. Nothing was saved. Please open it again.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("Post Name")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("PostForm preview", () => {
  function preview() {
    return screen.queryByRole("region", { name: "Post preview" });
  }

  async function fillPost(user) {
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Header"), "A walk");
    await user.type(
      screen.getByLabelText("Paragraph"),
      "We went for a **walk**.",
    );
  }

  const EXPECTED_PAYLOAD = {
    websiteId: "w1",
    postName: "Walk day",
    header: "A walk",
    subHeader: null,
    postDate: null,
    active: true,
    body: [{ type: "paragraph", text: "We went for a **walk**." }],
  };

  it("shows the post beside the form, with its formatting, as it is typed", async () => {
    const { user } = renderCreate();

    await fillPost(user);

    expect(
      within(preview()).getByRole("heading", { name: "A walk" }),
    ).toBeInTheDocument();
    expect(within(preview()).getByText(/We went for a/)).toContainHTML(
      "We went for a <b>walk</b>.",
    );
  });

  it("starts open on desktop, and its toggle hides it and shows it again", async () => {
    const { user } = renderCreate();
    const toggle = screen.getByRole("button", { name: "Preview" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(preview()).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(preview()).not.toBeInTheDocument();

    await user.click(toggle);
    expect(preview()).toBeInTheDocument();
  });

  it("has a single Publish button on desktop, under the form, with the preview open or hidden", async () => {
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await fillPost(user);
    expect(screen.getAllByRole("button", { name: "Publish" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getAllByRole("button", { name: "Publish" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(EXPECTED_PAYLOAD);
  });

  it("shows a backend error once, under Publish, with the preview open", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Something went wrong, please try again.",
    });
    const { user } = renderCreate({ onSubmit });
    await fillPost(user);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findAllByText("Something went wrong, please try again."),
    ).toHaveLength(1);
  });

  it("on a phone, swaps the form for the preview and back, keeping everything typed", async () => {
    stubMatchMedia(true);
    const { user } = renderCreate();
    await fillPost(user);
    expect(preview()).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      within(preview()).getByRole("heading", { name: "A walk" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Post Name")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Back to edit" }));

    expect(preview()).not.toBeInTheDocument();
    expect(screen.getByLabelText("Post Name")).toBeVisible();
    expect(screen.getByLabelText("Post Name")).toHaveValue("Walk day");
  });

  it("on a phone, publishes from the preview view", async () => {
    stubMatchMedia(true);
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await fillPost(user);
    await user.click(screen.getByRole("button", { name: "Preview" }));

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(EXPECTED_PAYLOAD);
  });
});
