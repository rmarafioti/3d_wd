// Tests for validation: every rule in docs/api.md → Validation rules at its boundaries, with
// messages checked word for word (docs/flows.md for Create an Account, the backend's field
// messages for posts, paragraphs, images and links).

import { describe, expect, it } from "vitest";
import {
  isBlank,
  isHttpsUrl,
  isTooLong,
  isValidDate,
  isValidEmail,
  isWholeNumberInRange,
  validateBody,
  validateImage,
  validateLink,
  validateParagraph,
  validatePost,
  validateWebsite,
} from "./validation";

const VALID_IMAGE = {
  src: "https://res.cloudinary.com/demo/image.jpg",
  width: "800",
  height: "600",
  altText: "Stevie on the couch",
};
const VALID_POST = { postName: "Walk day" };

describe("isBlank", () => {
  it.each([undefined, null, "", "   ", "\n\t"])(
    "treats %j as blank",
    (value) => {
      expect(isBlank(value)).toBe(true);
    },
  );

  it("treats text with surrounding spaces as not blank", () => {
    expect(isBlank("  a  ")).toBe(false);
  });
});

describe("isTooLong", () => {
  it("allows exactly max characters and rejects max + 1", () => {
    expect(isTooLong("a".repeat(100), 100)).toBe(false);
    expect(isTooLong("a".repeat(101), 100)).toBe(true);
  });

  it("counts length after trimming", () => {
    expect(isTooLong(`  ${"a".repeat(100)}  `, 100)).toBe(false);
  });

  it("treats a missing value as not too long", () => {
    expect(isTooLong(null, 100)).toBe(false);
  });
});

describe("isValidEmail", () => {
  it.each(["rich@example.com", "  rich@example.com  ", "a.b+c@sub.example.co"])(
    "accepts %j",
    (value) => {
      expect(isValidEmail(value)).toBe(true);
    },
  );

  it.each([
    "",
    "rich",
    "rich@",
    "rich@example",
    "@example.com",
    "ri ch@example.com",
  ])("rejects %j", (value) => {
    expect(isValidEmail(value)).toBe(false);
  });
});

describe("isHttpsUrl", () => {
  it.each(["https://www.steviethedog.com", "  https://example.com/path?q=1  "])(
    "accepts %j",
    (value) => {
      expect(isHttpsUrl(value)).toBe(true);
    },
  );

  it.each([
    "http://example.com",
    "https://",
    "example.com",
    "ftp://example.com",
    "",
    null,
  ])("rejects %j", (value) => {
    expect(isHttpsUrl(value)).toBe(false);
  });
});

describe("isValidDate", () => {
  it.each(["2026-10-07", "2028-02-29", " 2026-01-31 "])(
    "accepts %j",
    (value) => {
      expect(isValidDate(value)).toBe(true);
    },
  );

  it.each([
    "2026-02-30",
    "2027-02-29",
    "2026-13-01",
    "2026-1-5",
    "07/10/2026",
    "",
  ])("rejects %j", (value) => {
    expect(isValidDate(value)).toBe(false);
  });
});

describe("isWholeNumberInRange", () => {
  it.each(["1", "10000", " 12 ", 800])("accepts %j in 1–10000", (value) => {
    expect(isWholeNumberInRange(value, 1, 10000)).toBe(true);
  });

  it.each(["0", "10001", "1.5", "-5", "abc", "", "1e3"])(
    "rejects %j",
    (value) => {
      expect(isWholeNumberInRange(value, 1, 10000)).toBe(false);
    },
  );
});

describe("validateWebsite", () => {
  it("needs nothing more when an existing website is picked", () => {
    expect(
      validateWebsite({ websiteId: "w1", websiteName: "", websiteUrl: "" }),
    ).toEqual({});
  });

  it("requires a name and an https:// URL for a new website, with the flows.md messages", () => {
    expect(
      validateWebsite({
        websiteId: "",
        websiteName: " ",
        websiteUrl: "http://x.com",
      }),
    ).toEqual({
      websiteName: "A website name is required",
      websiteUrl: "A valid URL starting with https:// is required",
    });
  });
});

describe("validateImage", () => {
  it("accepts a complete image", () => {
    expect(validateImage(VALID_IMAGE)).toEqual({});
  });

  it("reports every missing field with the backend's messages", () => {
    expect(
      validateImage({ src: "", width: "", height: "", altText: "  " }),
    ).toEqual({
      src: "Image URL is required.",
      width: "Width must be a whole number between 1 and 10000.",
      height: "Height must be a whole number between 1 and 10000.",
      altText: "Alt text is required.",
    });
  });

  it("rejects a non-https src and alt text over 200 characters", () => {
    expect(
      validateImage({
        ...VALID_IMAGE,
        src: "http://x.com/a.jpg",
        altText: "a".repeat(201),
      }),
    ).toEqual({
      src: "Must be a valid URL starting with https://",
      altText: "Alt text must be 200 characters or fewer.",
    });
  });
});

describe("validateLink", () => {
  it("accepts a complete link", () => {
    expect(
      validateLink({ name: "Instagram", url: "https://instagram.com/stevie" }),
    ).toEqual({});
  });

  it("reports missing fields with the backend's messages", () => {
    expect(validateLink({ name: "", url: "" })).toEqual({
      name: "Link name is required.",
      url: "Link URL is required.",
    });
  });

  it("rejects a name over 100 characters and a non-https URL", () => {
    expect(
      validateLink({ name: "a".repeat(101), url: "http://x.com" }),
    ).toEqual({
      name: "Link name must be 100 characters or fewer.",
      url: "Must be a valid URL starting with https://",
    });
  });
});

describe("validateParagraph", () => {
  it("requires text that isn't blank after trimming", () => {
    expect(validateParagraph({ text: " \n " })).toEqual({
      text: "Paragraph is required.",
    });
  });

  it("allows 10000 characters and rejects 10001", () => {
    expect(validateParagraph({ text: "a".repeat(10000) })).toEqual({});
    expect(validateParagraph({ text: "a".repeat(10001) })).toEqual({
      text: "Paragraph must be 10000 characters or fewer.",
    });
  });
});

describe("validateBody", () => {
  it("accepts a body with at least one paragraph that has text", () => {
    expect(
      validateBody([
        { type: "image" },
        { type: "paragraph", text: "" },
        { type: "paragraph", text: "Hi" },
      ]),
    ).toEqual({});
  });

  it.each([
    ["an empty body", []],
    ["an image-only body", [{ type: "image" }]],
    [
      "a body whose only paragraph is blank",
      [{ type: "paragraph", text: " " }],
    ],
  ])("rejects %s", (_, elements) => {
    expect(validateBody(elements)).toEqual({
      body: "One paragraph is required to submit a post.",
    });
  });
});

describe("validatePost", () => {
  it("accepts the required fields alone", () => {
    expect(validatePost(VALID_POST)).toEqual({});
  });

  it("requires a website only when requireWebsite is set", () => {
    expect(validatePost({ ...VALID_POST, websiteId: "" })).toEqual({});
    expect(
      validatePost({ ...VALID_POST, websiteId: "" }, { requireWebsite: true }),
    ).toEqual({
      websiteId: "Website is required.",
    });
  });

  it("reports missing required fields with the backend's messages", () => {
    expect(validatePost({ postName: " " })).toEqual({
      postName: "Post name is required.",
    });
  });

  it("enforces every max length at max + 1", () => {
    expect(
      validatePost({
        postName: "a".repeat(101),
        header: "a".repeat(151),
        subHeader: "a".repeat(201),
      }),
    ).toEqual({
      postName: "Post name must be 100 characters or fewer.",
      header: "Header must be 150 characters or fewer.",
      subHeader: "Sub header must be 200 characters or fewer.",
    });
  });

  it("allows every field at exactly its max length", () => {
    expect(
      validatePost({
        postName: "a".repeat(100),
        header: "a".repeat(150),
        subHeader: "a".repeat(200),
      }),
    ).toEqual({});
  });

  it("checks postDate only when one is given", () => {
    expect(validatePost({ ...VALID_POST, postDate: "" })).toEqual({});
    expect(validatePost({ ...VALID_POST, postDate: "2026-02-30" })).toEqual({
      postDate: "Enter a valid date (YYYY-MM-DD).",
    });
  });
});
