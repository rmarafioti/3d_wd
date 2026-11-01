// shrinkImage: the photo re-encoded to fit 2500 px before upload, keeping its orientation, as
// PNG for a PNG and JPEG otherwise, and the picked file itself when the browser can't shrink it.

import { describe, expect, it } from "vitest";
import { imageFile, stubImageShrinking } from "../../test/helpers";
import { shrinkImage } from "./shrinkImage";

describe("shrinkImage", () => {
  it("scales a photo's long side down to 2500 px", async () => {
    const { encodes } = stubImageShrinking({ width: 4000, height: 5000 });

    await shrinkImage(imageFile("walk.jpg"));

    expect(encodes).toEqual([
      expect.objectContaining({ width: 2000, height: 2500 }),
    ]);
  });

  it("never scales a small photo up", async () => {
    const { encodes } = stubImageShrinking({ width: 1200, height: 800 });

    await shrinkImage(imageFile("walk.jpg"));

    expect(encodes).toEqual([
      expect.objectContaining({ width: 1200, height: 800 }),
    ]);
  });

  it("decodes with the photo's own orientation, so a rotated photo stays upright", async () => {
    const { decodes } = stubImageShrinking({ width: 1200, height: 800 });
    const file = imageFile("walk.jpg");

    await shrinkImage(file);

    expect(decodes).toEqual([
      { file, options: { imageOrientation: "from-image" } },
    ]);
  });

  it("re-encodes a jpg as a JPEG at 0.85 quality", async () => {
    const { encodes } = stubImageShrinking({ width: 1200, height: 800 });

    const shrunk = await shrinkImage(imageFile("walk.jpeg"));

    expect(encodes[0]).toMatchObject({ type: "image/jpeg", quality: 0.85 });
    expect(shrunk.name).toBe("walk.jpg");
    expect(shrunk.type).toBe("image/jpeg");
  });

  it("re-encodes a webp as a JPEG", async () => {
    stubImageShrinking({ width: 1200, height: 800 });

    const shrunk = await shrinkImage(imageFile("walk.webp", "image/webp"));

    expect(shrunk.name).toBe("walk.jpg");
    expect(shrunk.type).toBe("image/jpeg");
  });

  it("keeps a PNG as a PNG, so its transparency stays", async () => {
    stubImageShrinking({ width: 1200, height: 800 });

    const shrunk = await shrinkImage(imageFile("logo.png", "image/png"));

    expect(shrunk.name).toBe("logo.png");
    expect(shrunk.type).toBe("image/png");
  });

  it("returns the picked file when the browser can't decode it", async () => {
    stubImageShrinking({ fail: true });
    const file = imageFile("walk.jpg");

    expect(await shrinkImage(file)).toBe(file);
  });
});
