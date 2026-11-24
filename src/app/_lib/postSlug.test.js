// Tests for postSlug: the backend's slug rule, case for case, and the Web address field's form of
// it while typing.

import { describe, expect, it } from "vitest";
import { toPostSlug, toTypedSlug } from "./postSlug";

describe("toPostSlug", () => {
  it("lowercases and turns every run of other characters into one hyphen, ends trimmed", () => {
    expect(toPostSlug("Why dbt Tests Matter!")).toBe("why-dbt-tests-matter");
    expect(toPostSlug("  My First Post  ")).toBe("my-first-post");
    expect(toPostSlug("a -- b")).toBe("a-b");
  });

  it("removes accents, and turns letters that don't decompose into hyphens", () => {
    expect(toPostSlug("Café Crème")).toBe("cafe-creme");
    expect(toPostSlug("Straße")).toBe("stra-e");
  });

  it("is null when no letter or digit is left", () => {
    expect(toPostSlug("!!!")).toBeNull();
    expect(toPostSlug("")).toBeNull();
    expect(toPostSlug(null)).toBeNull();
  });

  it("keeps a slug of exactly 60 characters", () => {
    const slug = `${"a".repeat(29)}-${"b".repeat(30)}`;

    expect(toPostSlug(slug)).toBe(slug);
  });

  it("cuts a longer one back to a word boundary", () => {
    const header = `${"word ".repeat(12)}end`;

    const slug = toPostSlug(header);

    expect(slug).toBe(Array(12).fill("word").join("-"));
    expect(slug.length).toBeLessThanOrEqual(60);
  });

  it("cuts a single word longer than 60 at 60", () => {
    expect(toPostSlug("a".repeat(70))).toBe("a".repeat(60));
  });
});

describe("toTypedSlug", () => {
  it("converts as typed, keeping one hyphen at the end for the next word", () => {
    expect(toTypedSlug("My First ")).toBe("my-first-");
    expect(toTypedSlug("Hello!!!")).toBe("hello-");
    expect(toTypedSlug("Café")).toBe("cafe");
  });

  it("drops characters a slug can't start with", () => {
    expect(toTypedSlug("!!!")).toBe("");
    expect(toTypedSlug(" a")).toBe("a");
  });
});
