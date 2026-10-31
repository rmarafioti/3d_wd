// The gallery's own fields as Create / Edit a Gallery shows them (docs/flows.md → Create a
// Gallery), shared by GalleryForm (each field's input, in its step and in its own dialog) and
// GalleryToolbar (each field's row), so a field reads the same everywhere: label, its name in
// sentences ("Edit title", "Actions for copy"), its limit, its help text, and its toolbar row
// while empty. The limits match docs/api.md → Validation rules (checked in validation.js's
// validateGallery).

export const GALLERY_FIELDS = {
  galleryName: {
    label: "Gallery Name",
    name: "gallery name",
    max: 100,
    note: "Only you see this, it's how you find the gallery on your dashboard.",
  },
  title: {
    label: "Title",
    name: "title",
    max: 150,
    empty: "No title",
  },
  copy: {
    label: "Copy",
    name: "copy",
    max: 2000,
    multiline: true,
    note: "Line breaks you add will show on your website.",
    empty: "No copy",
  },
};

// The optional fields, in the order they show on the gallery.
export const OPTIONAL_GALLERY_FIELDS = ["title", "copy"];

export const MAX_GALLERY_IMAGES = 30;
export const MAX_CAPTION = 300;

// Each image's name for screen readers ("image 3"), so its buttons and menu can be told apart.
export function imageNames(images) {
  return images.map((_image, index) => `image ${index + 1}`);
}
