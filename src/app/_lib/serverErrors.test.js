// Tests for serverErrors: dropping the backend's field messages that no longer describe the form.

import { describe, expect, it } from "vitest";
import { withoutFieldErrors } from "./serverErrors";

describe("withoutFieldErrors", () => {
  it("drops the field messages whose path matches and keeps the rest", () => {
    const error = {
      message: "Please fix the highlighted fields.",
      fields: {
        "body.0.text": "Paragraph is required.",
        postName: "Post name is required.",
      },
    };

    const result = withoutFieldErrors(error, (path) =>
      path.startsWith("body."),
    );

    expect(result).toEqual({
      message: "Please fix the highlighted fields.",
      fields: { postName: "Post name is required." },
    });
  });

  it("returns an error with no field messages, or no error, unchanged", () => {
    const error = { message: "Something went wrong, please try again." };

    expect(withoutFieldErrors(error, () => true)).toBe(error);
    expect(withoutFieldErrors(null, () => true)).toBeNull();
  });
});
