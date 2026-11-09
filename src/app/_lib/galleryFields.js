// galleryFields: the gallery's own fields (label, name in sentences, limit, help text, empty row),
// shared by GalleryForm and GalleryToolbar so a field reads the same everywhere, and shared texts.

// Delete a Gallery's confirmation, the same on the gallery page and the dashboard's ⋮ menu.
export function deleteGalleryMessage(galleryName) {
  return `Delete ${galleryName}? It will be removed from your dashboard and your website. You can restore it from Recently Deleted for 30 days.`;
}

// The limits match docs/api.md → Validation rules (validateGallery checks them).
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

// The publish date's note, the same in the gallery form and on the gallery page: publishing
// doesn't place a gallery on the website, the administrator sets its placement live.
export const GALLERY_PUBLISH_DATE_NOTE =
  "Your gallery also needs its placement before it shows on your website.";
