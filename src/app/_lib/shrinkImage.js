// shrinkImage: re-encodes a picked photo in the browser before it is uploaded, so a phone's 3 to
// 8 MB original goes up well under 1 MB, without its metadata (docs/api.md → Endpoints, Notes).

// Cloudinary keeps nothing larger anyway (the signed c_limit,w_2500,h_2500).
const MAX_SIDE = 2500;
const JPEG_QUALITY = 0.85;

// The canvas's toBlob as a promise; null when the browser can't encode the image.
function encode(canvas, type) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, JPEG_QUALITY));
}

// file: a File already checked by ImageField (jpg, png or webp, at most 10 MB). Returns the
// shrunk File, or the original when the browser can't decode or encode it, so Submit never fails
// here: the original is still a valid upload, and Cloudinary scales it down itself.
export async function shrinkImage(file) {
  let bitmap;
  try {
    // "from-image" applies the photo's EXIF orientation, so a photo the phone saved rotated
    // isn't uploaded sideways once its metadata is gone.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  // Every photo is re-encoded, however small, so its metadata (a phone photo's GPS location among
  // it) never goes up.
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // A PNG stays PNG, so a logo keeps its transparency; jpg and webp become JPEG.
    const isPng = file.type === "image/png";
    const blob = await encode(canvas, isPng ? "image/png" : "image/jpeg");
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]*$/, "") + (isPng ? ".png" : ".jpg");
    return new File([blob], name, { type: blob.type });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
