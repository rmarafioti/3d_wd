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
