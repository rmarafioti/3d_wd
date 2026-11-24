// postSlug: the backend's rule for a post's web address (its slug), so Create a Post's Web address
// field shows exactly what the backend saves (docs/api.md → Notes, a post's slug).

import { POST_FIELDS } from "./postFields";

// The characters a slug keeps: accents removed, lowercased, every run of other characters one
// hyphen. The ends are left to the caller.
function slugCharacters(value) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

// A header or an entered web address in slug form, ends trimmed, at most the field's max cut at a
// word boundary. Null when no letter or digit is left.
export function toPostSlug(value) {
  const max = POST_FIELDS.slug.max;
  const slug = slugCharacters(value).replace(/^-+|-+$/g, "");
  if (!slug) return null;
  if (slug.length <= max) return slug;
  // Back to the last hyphen within one character past the max, so no word is cut in half; a single
  // word longer than the max has no hyphen to go back to and is cut at it.
  return slug
    .slice(0, max + 1)
    .replace(/-[^-]*$/, "")
    .slice(0, max);
}

// The Web address field's value as it is typed: in slug form, but one hyphen is kept at the end so
// the next word joins on to it. The field trims it once it is left.
export function toTypedSlug(value) {
  return slugCharacters(value).replace(/^-+/, "");
}
