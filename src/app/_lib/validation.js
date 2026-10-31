// validation: the frontend copy of the rules in docs/api.md → Validation rules. UX only —
// the backend re-validates everything and its rejections must still be shown. Every check
// trims first, so a field holding only spaces counts as empty.

import { findLinks } from "./postFormatting";

// Deliberately loose (something@something.something); the backend has the final say.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// An image file the site owner can pick (docs/api.md → Endpoints, Notes): Cloudinary is signed
// to accept only these formats, and the frontend checks the size before uploading.
const IMAGE_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
// Paragraph link messages, word for word from docs/api.md → Paragraph formatting.
const LINK_URL_MESSAGE = "Each link must be a valid URL starting with https://";
const LINK_TEXT_REQUIRED_MESSAGE = "Each link needs link text.";
const LINK_TEXT_TOO_LONG_MESSAGE = "Link text must be 100 characters or fewer.";
// The backend's 409 for a taken gallery name, word for word (docs/api.md → Error messages), which
// the form also shows before submit. Exported so GalleryForm can show it without waiting for blur.
export const GALLERY_NAME_TAKEN_MESSAGE =
  "A gallery with this name already exists.";

export function isBlank(value) {
  return (value ?? "").trim() === "";
}

export function isTooLong(value, max) {
  return (value ?? "").trim().length > max;
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

// Validates a WebsitePicker value. A picked existing website needs nothing more; a new
// website needs a name and an https:// URL. Returns { fieldName: message } for each failure.
// These messages are the ones docs/flows.md lists for Create an Account.
export function validateWebsite({ websiteId, websiteName, websiteUrl }) {
  const errors = {};
  if (websiteId) return errors;
  if (isBlank(websiteName)) errors.websiteName = "A website name is required";
  if (!isHttpsUrl(websiteUrl))
    errors.websiteUrl = "A valid URL starting with https:// is required";
  return errors;
}

// Messages below match the backend's field messages word for word, unless noted.

// Checks a picked image file before it is kept: jpg, png or webp, at most 10 MB. Returns the
// message for a refused file, or null. These messages are the form's own (docs/flows.md).
export function imageFileError(file) {
  if (!IMAGE_FILE_TYPES.includes(file.type))
    return "Choose a jpg, png or webp image.";
  if (file.size > MAX_IMAGE_FILE_BYTES)
    return "Images must be 10 MB or smaller.";
  return null;
}

// Validates one image element (the Add / Edit image dialog's Insert). Returns
// { fieldName: message } for each failure. src is set together with width and height (a picked
// file's once it loads, or the stored image's), so an image with a src always has its size. The src message is the form's own; the
// alt text messages match the backend's word for word.
export function validateImage({ src, altText }) {
  const errors = {};
  if (isBlank(src)) errors.src = "Choose an image.";
  if (isBlank(altText)) errors.altText = "Alt text is required.";
  else if (isTooLong(altText, 200))
    errors.altText = "Alt text must be 200 characters or fewer.";
  return errors;
}

// Validates one link in a paragraph, from findLinks or the editor's Link panel. Returns
// { linkText, url } messages for each failure.
export function validateParagraphLink({ linkText, url }) {
  const errors = {};
  if (isBlank(linkText)) errors.linkText = LINK_TEXT_REQUIRED_MESSAGE;
  else if (isTooLong(linkText, 100))
    errors.linkText = LINK_TEXT_TOO_LONG_MESSAGE;
  if (!isHttpsUrl(url)) errors.url = LINK_URL_MESSAGE;
  return errors;
}

// The message for the first failing [link text](url) in a paragraph, or null when every link
// passes. A link's text is checked before its URL, as on the backend.
function linkErrorIn(text) {
  for (const link of findLinks(text)) {
    const errors = validateParagraphLink(link);
    if (errors.linkText) return errors.linkText;
    if (errors.url) return errors.url;
  }
  return null;
}

// Validates one paragraph element (the paragraph dialogs' Insert). Only the ends are trimmed when
// sent, so line breaks inside the text, and its formatting markup, count toward the length.
export function validateParagraph({ text }) {
  const errors = {};
  if (isBlank(text)) {
    errors.text = "Paragraph is required.";
    return errors;
  }
  if (isTooLong(text, 10000)) {
    errors.text = "Paragraph must be 10000 characters or fewer.";
    return errors;
  }
  const linkError = linkErrorIn(text);
  if (linkError) errors.text = linkError;
  return errors;
}

// Validates the top-level fields of the Create / Edit a Post form (each body element is checked
// by validateParagraph or validateImage before it is inserted). websiteId is only checked when
// requireWebsite is set (Create); Edit has no Website field.
export function validatePost(
  { websiteId, postName, postDate, header, subHeader },
  { requireWebsite = false } = {},
) {
  const errors = {};
  if (requireWebsite && isBlank(websiteId))
    errors.websiteId = "Website is required.";
  if (isBlank(postName)) errors.postName = "Post name is required.";
  else if (isTooLong(postName, 100))
    errors.postName = "Post name must be 100 characters or fewer.";
  if (!isBlank(postDate) && !isValidDate(postDate))
    errors.postDate = "Enter a valid date (YYYY-MM-DD).";
  if (isTooLong(header, 150))
    errors.header = "Header must be 150 characters or fewer.";
  if (isTooLong(subHeader, 200))
    errors.subHeader = "Sub header must be 200 characters or fewer.";
  return errors;
}

// The names a gallery can't take (docs/api.md → Validation rules): the website's other
// galleries' names, trimmed and lowercased, since names are unique ignoring case. ownId leaves
// out the gallery being edited, so it can keep its own name. website: a website from
// GET /api/siteOwner/websites, or undefined before one is chosen.
export function takenGalleryNames(website, ownId) {
  return (website?.galleries ?? [])
    .filter((gallery) => gallery.id !== ownId)
    .map((gallery) => gallery.galleryName.trim().toLowerCase());
}

// Validates the top-level fields of the Create / Edit a Gallery form (each image is checked by
// validateGalleryImage before it is inserted). websiteId is only checked when requireWebsite is
// set (Create). takenNames is takenGalleryNames' list: a taken name is refused before submit, with
// the backend's 409 message, word for word, and the 409 stays the backend's fallback.
export function validateGallery(
  { websiteId, galleryName, title, copy },
  { requireWebsite = false, takenNames = [] } = {},
) {
  const errors = {};
  if (requireWebsite && isBlank(websiteId))
    errors.websiteId = "Website is required.";
  if (isBlank(galleryName)) errors.galleryName = "Gallery name is required.";
  else if (isTooLong(galleryName, 100))
    errors.galleryName = "Gallery name must be 100 characters or fewer.";
  else if (takenNames.includes(galleryName.trim().toLowerCase()))
    errors.galleryName = GALLERY_NAME_TAKEN_MESSAGE;
  if (isTooLong(title, 150))
    errors.title = "Title must be 150 characters or fewer.";
  if (isTooLong(copy, 2000))
    errors.copy = "Copy must be 2000 characters or fewer.";
  return errors;
}

// Validates one gallery image (the Add / Edit image dialog's Insert): a post image's checks, plus
// its optional caption. Its crops are made by the crop tool in the shape the backend needs, so
// they need no check here.
export function validateGalleryImage(image) {
  const errors = validateImage(image);
  if (isTooLong(image.caption, 300))
    errors.caption = "Caption must be 300 characters or fewer.";
  return errors;
}
