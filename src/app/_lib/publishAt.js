// publishAt: a draft's publish date, converted between the form's local date field and the API's
// ISO instant, the start of that day (docs/api.md → publishAt), and shown in local time.

function pad(number) {
  return String(number).padStart(2, "0");
}

// A local day as a date field's value, YYYY-MM-DD.
function toDateField(local) {
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
}

// "2026-11-20" as midnight at the start of that day in the site owner's time zone, sent as an
// instant. Null while no whole date is picked.
export function toPublishAt(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((date ?? "").trim());
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day).toISOString();
}

// The request's publishAt, built from the form: only a draft carries one, sent every time (null
// when it isn't scheduled) so an Edit stays a full form; a published item leaves it out.
export function publishAtPayload(status, publishDate) {
  if (status !== "draft") return {};
  return { publishAt: toPublishAt(publishDate) };
}

// The date field's value for a stored publishAt, its local day; "" when there is none.
export function publishAtToDate(publishAt) {
  return publishAt ? toDateField(new Date(publishAt)) : "";
}

// The earliest publish date, tomorrow: today's midnight has already passed.
export function earliestPublishDate() {
  const now = new Date();
  return toDateField(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  );
}

// A publish date (or any instant) as its local day, "Nov 20, 2026", with the year always, so a
// date next year is never misread.
export function formatDay(instant) {
  return new Date(instant).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// The dashboard tables' Live on: when a published item went live (publishedAt), or a scheduled
// draft's publish date (publishAt). Only a published item has the first and only a draft the
// second, so at most one is set; a draft with neither says so.
export function liveOnDate({ publishedAt, publishAt }) {
  const liveOn = publishedAt ?? publishAt;
  return liveOn ? formatDay(liveOn) : "No publish date selected";
}
