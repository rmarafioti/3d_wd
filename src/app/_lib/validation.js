// validation: the frontend copy of the rules in docs/api.md → Validation rules. UX only —
// the backend re-validates everything and its rejections must still be shown. Every check
// trims first, so a field holding only spaces counts as empty.

// Deliberately loose (something@something.something); the backend has the final say.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isBlank(value) {
  return (value ?? "").trim() === "";
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test((value ?? "").trim());
}

export function isHttpsUrl(value) {
  try {
    return new URL((value ?? "").trim()).protocol === "https:";
  } catch {
    return false;
  }
}

// Validates a WebsitePicker value. A picked existing website needs nothing more; a new
// website needs a name and an https:// URL. Returns { fieldName: message } for each failure.
export function validateWebsite({ websiteId, websiteName, websiteUrl }) {
  const errors = {};
  if (websiteId) return errors;
  if (isBlank(websiteName)) errors.websiteName = "A website name is required";
  if (!isHttpsUrl(websiteUrl))
    errors.websiteUrl = "A valid URL starting with https:// is required";
  return errors;
}

// A real calendar date in YYYY-MM-DD form. The round trip through Date rejects dates that
// match the pattern but don't exist (2026-02-30 would roll over to March).
export function isValidDate(value) {
  const trimmed = (value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const date = new Date(`${trimmed}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().startsWith(trimmed)
  );
}

// Width and height are held as strings while editing (that's what <input type="number">
// gives), so this checks the string is a whole number within the range.
export function isWholeNumberInRange(value, min, max) {
  const trimmed = String(value ?? "").trim();
  if (!/^\d+$/.test(trimmed)) return false;
  const number = Number(trimmed);
  return number >= min && number <= max;
}

const HTTPS_MESSAGE = "Must be a valid URL starting with https://";

// Messages below match the backend's field messages word for word.

// Validates one image in ImageLinkFields. Returns { fieldName: message } for each failure.
export function validateImage({ src, width, height, altText }) {
  const errors = {};
  if (isBlank(src)) errors.src = "Image URL is required.";
  else if (!isHttpsUrl(src)) errors.src = HTTPS_MESSAGE;
  if (!isWholeNumberInRange(width, 1, 10000))
    errors.width = "Width must be a whole number between 1 and 10000.";
  if (!isWholeNumberInRange(height, 1, 10000))
    errors.height = "Height must be a whole number between 1 and 10000.";
  if (isBlank(altText)) errors.altText = "Alt text is required.";
  else if (altText.trim().length > 200)
    errors.altText = "Alt text must be 200 characters or fewer.";
  return errors;
}

// Validates one link in ImageLinkFields. Returns { fieldName: message } for each failure.
export function validateLink({ name, url }) {
  const errors = {};
  if (isBlank(name)) errors.name = "Link name is required.";
  else if (name.trim().length > 100)
    errors.name = "Link name must be 100 characters or fewer.";
  if (isBlank(url)) errors.url = "Link URL is required.";
  else if (!isHttpsUrl(url)) errors.url = HTTPS_MESSAGE;
  return errors;
}

// Validates the top-level fields of the Create / Edit a Post form. websiteId is only
// checked when requireWebsite is set (Create); Edit has no Website field.
export function validatePost(
  { websiteId, postName, postDate, header, subHeader, body },
  { requireWebsite = false } = {},
) {
  const errors = {};
  if (requireWebsite && isBlank(websiteId))
    errors.websiteId = "Website is required.";
  if (isBlank(postName)) errors.postName = "Post name is required.";
  else if (postName.trim().length > 100)
    errors.postName = "Post name must be 100 characters or fewer.";
  if (!isBlank(postDate) && !isValidDate(postDate))
    errors.postDate = "Enter a valid date (YYYY-MM-DD).";
  if ((header ?? "").trim().length > 150)
    errors.header = "Header must be 150 characters or fewer.";
  if ((subHeader ?? "").trim().length > 200)
    errors.subHeader = "Sub header must be 200 characters or fewer.";
  if (isBlank(body)) errors.body = "Body is required.";
  else if (body.trim().length > 5000)
    errors.body = "Body must be 5000 characters or fewer.";
  return errors;
}
