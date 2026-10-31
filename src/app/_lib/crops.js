// crops: a gallery image's two optional crops (docs/api.md → Notes, Crops), the square thumbnail
// and the mobile crop (at least as tall as it is wide), each { x, y, width, height } in the stored
// image's pixels. The crop tool works on the image the browser shows: a picked file at its own
// size, or a stored image at its stored size. Cloudinary scales a file larger than 2500 × 2500
// down as it stores it, so a crop picked on such a file is scaled to the stored size after upload
// (scaleCrop), rounded to whole pixels and kept inside the image, in the shape the backend checks.
// A gallery's crops are consistent (Rich, 2026-10-31): every image has a thumbnail crop or none
// does, every image has a mobile crop or none does, and every mobile crop has one shape. cropRules
// says what an image's dialog must follow, cropIssues what the gallery as a whole still lacks, and
// reshapeCrop redraws a mobile crop when the gallery's shape changes.

// The shapes the mobile crop offers, as width / height, 4:5 first (the default).
export const MOBILE_SHAPES = [
  { label: "4:5", aspect: 4 / 5 },
  { label: "3:4", aspect: 3 / 4 },
  { label: "9:16", aspect: 9 / 16 },
  { label: "1:1", aspect: 1 },
];

// The thumbnail is always square.
export const THUMBNAIL_ASPECT = 1;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// crop: in the pixels of an image sized `from` ({ width, height }). Returns it in the pixels of the
// same image sized `to`, or null for no crop. Cloudinary scales both sides by one factor, so one
// scale serves x and y. With `from` and `to` the same, it only rounds and fits the crop, which
// also tidies the crop tool's own numbers before they are kept.
// kind "thumbnail": exactly square, the smaller of its two sides. kind "mobile": its height at
// least its width.
export function scaleCrop(crop, from, to, kind) {
  if (!crop) return null;
  const scale = to.width / from.width;

  let width = Math.max(1, Math.min(Math.round(crop.width * scale), to.width));
  let height = Math.max(
    1,
    Math.min(Math.round(crop.height * scale), to.height),
  );
  if (kind === "thumbnail") {
    width = Math.min(width, height);
    height = width;
  } else {
    height = Math.min(Math.max(height, width), to.height);
    width = Math.min(width, height);
  }

  return {
    x: clamp(Math.round(crop.x * scale), 0, to.width - width),
    y: clamp(Math.round(crop.y * scale), 0, to.height - height),
    width,
    height,
  };
}

// A mobile crop redrawn in another shape (aspect: width / height, from MOBILE_SHAPES), when the
// site owner changes the gallery's mobile shape: around the same centre, at the same height, then
// shrunk to fit the image (size: { width, height }, the pixels the crop is in), in whole pixels.
// Every mobile shape is at most as wide as it is tall, so the result is too.
export function reshapeCrop(crop, aspect, size) {
  const centreX = crop.x + crop.width / 2;
  const centreY = crop.y + crop.height / 2;
  let height = Math.min(crop.height, size.height);
  let width = Math.round(height * aspect);
  if (width > size.width) {
    width = size.width;
    height = Math.min(Math.round(width / aspect), size.height);
  }
  return {
    x: clamp(Math.round(centreX - width / 2), 0, size.width - width),
    y: clamp(Math.round(centreY - height / 2), 0, size.height - height),
    width,
    height,
  };
}

// The gallery's crop messages, on "images" (docs/api.md → Validation rules), and each image's own.
const THUMBNAILS_MESSAGE =
  "Add a thumbnail crop to every image, or remove them all.";
const MOBILES_MESSAGE = "Add a mobile crop to every image, or remove them all.";
const SHAPES_MESSAGE = "Every mobile crop must be the same shape.";
const NEEDS_THUMBNAIL = "Needs a thumbnail crop.";
const NEEDS_MOBILE = "Needs a mobile crop.";
export const DIFFERENT_SHAPE = "Mobile crop is a different shape.";

// Two crops have the same shape when their width / height are within 1%, which allows for
// whole-pixel rounding (a 4:5 crop scaled to 750 × 938).
export function sameShape(a, b) {
  const ratio = b.width / b.height;
  return Math.abs(a.width / a.height - ratio) <= ratio * 0.01;
}

// The MOBILE_SHAPES entry closest to a mobile crop's proportions.
export function shapeOf(crop) {
  const aspect = crop.width / crop.height;
  return MOBILE_SHAPES.reduce((best, shape) =>
    Math.abs(shape.aspect - aspect) < Math.abs(best.aspect - aspect)
      ? shape
      : best,
  );
}

// What the gallery's other images (all but the one keyed excludeKey) ask of one image's crops:
// a thumbnail crop when any of them has one, a mobile crop when any of them has one, and then the
// first of their mobile crops as the shape to match (mobileReference) and its MOBILE_SHAPES entry
// (mobileShape, which a later mobile crop is cropped in). null when no other image has a mobile
// crop.
export function cropRules(images, excludeKey) {
  const others = images.filter((image) => image.key !== excludeKey);
  const mobileReference =
    others.find((image) => image.mobileCrop)?.mobileCrop ?? null;
  return {
    thumbnailRequired: others.some((image) => image.thumbnailCrop),
    mobileRequired: Boolean(mobileReference),
    mobileReference,
    mobileShape: mobileReference ? shapeOf(mobileReference) : null,
  };
}

// One image's crops against cropRules: the messages for what it lacks, [] when nothing.
export function imageCropIssues(image, rules) {
  const issues = [];
  if (rules.thumbnailRequired && !image.thumbnailCrop)
    issues.push(NEEDS_THUMBNAIL);
  if (rules.mobileRequired && !image.mobileCrop) issues.push(NEEDS_MOBILE);
  else if (
    image.mobileCrop &&
    rules.mobileReference &&
    !sameShape(image.mobileCrop, rules.mobileReference)
  )
    issues.push(DIFFERENT_SHAPE);
  return issues;
}

// What the whole gallery still lacks: messages for its "images" list, and each image's own, by
// key. The first mobile crop in the gallery's order sets the shape, so a later one that differs is
// the one marked.
export function cropIssues(images) {
  const hasThumbnail = images.some((image) => image.thumbnailCrop);
  const firstMobile =
    images.find((image) => image.mobileCrop)?.mobileCrop ?? null;
  const messages = new Set();
  const rows = {};
  for (const image of images) {
    const issues = [];
    if (hasThumbnail && !image.thumbnailCrop) {
      issues.push(NEEDS_THUMBNAIL);
      messages.add(THUMBNAILS_MESSAGE);
    }
    if (firstMobile && !image.mobileCrop) {
      issues.push(NEEDS_MOBILE);
      messages.add(MOBILES_MESSAGE);
    } else if (image.mobileCrop && !sameShape(image.mobileCrop, firstMobile)) {
      issues.push(DIFFERENT_SHAPE);
      messages.add(SHAPES_MESSAGE);
    }
    if (issues.length > 0) rows[image.key] = issues.join(" ");
  }
  return { messages: [...messages], rows };
}
