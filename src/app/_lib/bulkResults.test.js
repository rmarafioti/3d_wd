// Tests for bulkResults: the failure line names each item that failed, from what was sent.

import { describe, expect, it } from "vitest";
import { failedMessage } from "./bulkResults";

describe("failedMessage", () => {
  it("names each failed item with its message, matched by type and id", () => {
    const sent = [
      { type: "gallery", id: "1", name: "Our Interior" },
      { type: "post", id: "1", name: "First Post!" },
    ];
    const failed = [
      {
        type: "gallery",
        id: "1",
        message: "A gallery with this name already exists.",
      },
      { type: "post", id: "1", message: "Post not found." },
    ];

    expect(failedMessage("restore", failed, sent)).toBe(
      "Couldn't restore: Our Interior (A gallery with this name already exists.); First Post! (Post not found.)",
    );
  });
});
