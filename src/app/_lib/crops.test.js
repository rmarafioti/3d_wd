// Tests for scaleCrop (docs/api.md → Notes, Crops): a crop picked on the browser's file is scaled
// to the size Cloudinary stored, rounded to whole pixels, kept inside the image, and kept in the
// shape the backend checks (a square thumbnail, a mobile crop at least as tall as it is wide). And
// what GalleryForm's flow tests can't easily reach: sameShape's allowance for whole-pixel rounding,
// cropIssues marking the mobile crops that differ from the gallery's first, and reshapeCrop at an
// image's edges.

import { describe, expect, it } from "vitest";
import {
  cropIssues,
  reshapeCrop,
  sameShape,
  scaleCrop,
  shapeOf,
} from "./crops";

const PICKED = { width: 4000, height: 3000 };
// What Cloudinary stores for a 4000 × 3000 file: scaled down to fit 2500 × 2500.
const STORED = { width: 2500, height: 1875 };

describe("scaleCrop", () => {
  it("scales a thumbnail crop to the stored size, rounding to whole pixels", () => {
    const crop = { x: 403, y: 301, width: 1600, height: 1600 };

    expect(scaleCrop(crop, PICKED, STORED, "thumbnail")).toEqual({
      x: 252,
      y: 188,
      width: 1000,
      height: 1000,
    });
  });

  it("keeps a thumbnail exactly square when its sides round apart", () => {
    const crop = { x: 0, y: 0, width: 1601, height: 1602 };

    const scaled = scaleCrop(crop, PICKED, STORED, "thumbnail");

    expect(scaled.width).toBe(scaled.height);
  });

  it("keeps a mobile crop at least as tall as it is wide", () => {
    const crop = { x: 0, y: 0, width: 1201, height: 1201 };

    const scaled = scaleCrop(crop, PICKED, STORED, "mobile");

    expect(scaled.height).toBeGreaterThanOrEqual(scaled.width);
  });

  it("keeps a crop at the image's far edge inside the stored image", () => {
    const crop = { x: 2401, y: 1401, width: 1599, height: 1599 };

    const scaled = scaleCrop(crop, PICKED, STORED, "thumbnail");

    expect(scaled.x + scaled.width).toBeLessThanOrEqual(STORED.width);
    expect(scaled.y + scaled.height).toBeLessThanOrEqual(STORED.height);
  });

  it("only tidies a crop already at the stored size", () => {
    const crop = { x: 10.4, y: 20.6, width: 300, height: 400 };

    expect(scaleCrop(crop, STORED, STORED, "mobile")).toEqual({
      x: 10,
      y: 21,
      width: 300,
      height: 400,
    });
  });

  it("returns null for no crop", () => {
    expect(scaleCrop(null, PICKED, STORED, "thumbnail")).toBeNull();
  });
});

describe("sameShape", () => {
  it("treats a crop rounded to whole pixels as its shape", () => {
    expect(
      sameShape({ width: 750, height: 938 }, { width: 4, height: 5 }),
    ).toBe(true);
    expect(shapeOf({ width: 750, height: 938 }).label).toBe("4:5");
  });

  it("tells two shapes apart", () => {
    expect(sameShape({ width: 3, height: 4 }, { width: 4, height: 5 })).toBe(
      false,
    );
  });
});

describe("cropIssues", () => {
  it("marks the mobile crops that differ from the gallery's first, not the first itself", () => {
    const images = [
      { key: "a", mobileCrop: { x: 0, y: 0, width: 400, height: 500 } },
      { key: "b", mobileCrop: { x: 0, y: 0, width: 270, height: 480 } },
      { key: "c", mobileCrop: { x: 0, y: 0, width: 800, height: 1000 } },
    ];

    expect(cropIssues(images)).toEqual({
      messages: ["Every mobile crop must be the same shape."],
      rows: { b: "Mobile crop is a different shape." },
    });
  });

  it("finds nothing when no image has a crop", () => {
    expect(cropIssues([{ key: "a" }, { key: "b" }])).toEqual({
      messages: [],
      rows: {},
    });
  });
});

describe("reshapeCrop", () => {
  const IMAGE = { width: 800, height: 600 };

  it("keeps a crop at the image's edge inside the image", () => {
    const crop = { x: 0, y: 0, width: 360, height: 600 };

    expect(reshapeCrop(crop, 4 / 5, IMAGE)).toEqual({
      x: 0,
      y: 0,
      width: 480,
      height: 600,
    });
  });

  it("shrinks a crop the new shape would make wider than the image", () => {
    const narrow = { width: 300, height: 600 };
    const crop = { x: 0, y: 0, width: 300, height: 600 };

    expect(reshapeCrop(crop, 1, narrow)).toEqual({
      x: 0,
      y: 150,
      width: 300,
      height: 300,
    });
  });
});
