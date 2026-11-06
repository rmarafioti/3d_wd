// Tests for publishAt: the local date field to and from the API's instant, tomorrow as the
// earliest date, the label, and the tables' Live on date.

import { afterEach, describe, it, expect, vi } from "vitest";
import {
  earliestPublishDate,
  formatDay,
  liveOnDate,
  publishAtToDate,
  toPublishAt,
} from "./publishAt";

describe("publishAt", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends a picked date as midnight at the start of that local day", () => {
    const instant = toPublishAt("2030-11-20");

    expect(instant).toBe(new Date(2030, 10, 20).toISOString());
  });

  it("sends null while no whole date is picked", () => {
    expect(toPublishAt("  ")).toBeNull();
    expect(toPublishAt("2030-11")).toBeNull();
  });

  it("gives back the same local date for a stored instant, and nothing for none", () => {
    expect(publishAtToDate(toPublishAt("2030-11-20"))).toBe("2030-11-20");
    expect(publishAtToDate(null)).toBe("");
  });

  it("offers tomorrow as the earliest date, across a month's end", () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2030, 10, 30, 23, 0) });

    expect(earliestPublishDate()).toBe("2030-12-01");
  });

  it("names the day and the year in the label, with no time", () => {
    const label = formatDay(toPublishAt("2030-11-20"));

    expect(label).toContain("Nov");
    expect(label).toContain("2030");
    expect(label).not.toMatch(/AM|PM|:/);
  });

  it("gives a published item's publishedAt as its Live on", () => {
    const publishedAt = toPublishAt("2026-11-02");

    expect(liveOnDate({ publishedAt, publishAt: null })).toBe(
      formatDay(publishedAt),
    );
  });

  it("gives a scheduled draft's publish date as its Live on, and says an unscheduled one has none", () => {
    const publishAt = toPublishAt("2030-11-20");

    expect(liveOnDate({ publishedAt: null, publishAt })).toBe(
      formatDay(publishAt),
    );
    expect(liveOnDate({ publishedAt: null, publishAt: null })).toBe(
      "No publish date selected",
    );
  });
});
