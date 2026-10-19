// Tests for postFormatting: findLinks lists every link the backend's scan does, and both scans
// stay fast on long paragraphs of unmatched markup (the backend uses the same 50 ms limit). How
// parseParagraph renders is tested through FormattedText against the contract's table.

import { describe, expect, it } from "vitest";
import { findLinks, parseParagraph } from "./postFormatting";

// 10,000 characters of `unit`, the paragraph limit.
function longParagraph(unit) {
  return unit.repeat(Math.ceil(10000 / unit.length)).slice(0, 10000);
}

describe("findLinks", () => {
  it("lists every link left to right, with its text and URL as typed", () => {
    expect(
      findLinks("[ ](http://x) then **[menu](https://example.com/menu)**"),
    ).toEqual([
      { linkText: " ", url: "http://x" },
      { linkText: "menu", url: "https://example.com/menu" },
    ]);
  });

  it("ends a URL at the first ) and skips text that isn't a link", () => {
    expect(
      findLinks("[no url] [menu] (https://x.com) [a](https://x.com/b)c)"),
    ).toEqual([{ linkText: "a", url: "https://x.com/b" }]);
  });
});

describe("speed on long unmatched markup", () => {
  it.each([
    ["["],
    ["[a]("],
    ["*"],
    ["**"],
    ["***"],
    ["**[a]("],
    ["*a "],
    ["[a](b "],
  ])("reads a 10,000-character paragraph of %j in under 50 ms", (unit) => {
    const text = longParagraph(unit);

    const started = performance.now();
    findLinks(text);
    parseParagraph(text);
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(50);
  });
});
