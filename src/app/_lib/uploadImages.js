// uploadImages: sends a post's or gallery's new images to 3DWD's Cloudinary account on Submit
// (docs/api.md → Endpoints, Notes). It signs once through apiFetch (our API: cookie and CSRF
// header), then posts each file straight to Cloudinary. This is the one fetch outside apiFetch:
// the upload goes to Cloudinary, not our API, so it carries no credentials and no CSRF header.

import { apiFetch } from "./apiFetch";

const UPLOAD_FAILED_MESSAGE =
  "Your images couldn't be uploaded, please try again.";

// Thrown when Cloudinary refuses an upload or can't be reached. Cloudinary's own message is
// never shown to the site owner.
class UploadError extends Error {
  constructor() {
    super(UPLOAD_FAILED_MESSAGE);
    this.name = "UploadError";
  }
}

// One file to Cloudinary. Every entry of `fields` is sent unchanged (an extra or renamed signed
// parameter breaks the signature), then the file as "file".
async function uploadOne(uploadUrl, fields, file) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  form.append("file", file);

  let response;
  try {
    response = await fetch(uploadUrl, { method: "POST", body: form });
  } catch {
    throw new UploadError();
  }
  if (!response.ok) throw new UploadError();

  const { secure_url, width, height } = await response.json();
  return { src: secure_url, width, height };
}

// files: the File objects to upload, all for the one website. Returns [{ src, width, height }]
// in the same order, as Cloudinary stored them. A failed sign throws its ApiError (a 401 has
// already redirected to sign-in); a failed upload throws UploadError.
async function uploadImages(websiteId, files) {
  const { uploadUrl, fields } = await apiFetch("/api/siteOwner/uploads/sign", {
    method: "POST",
    body: { websiteId },
  });
  return Promise.all(files.map((file) => uploadOne(uploadUrl, fields, file)));
}

// images: a form's images, each { src, file? }, where a picked image's src is its object URL and
// file the File the site owner picked. Uploads the picked ones and returns a Map from each one's
// object URL to its stored { src, width, height }; with nothing picked it signs nothing. The form
// swaps them in itself, so it can keep anything else on the image (a gallery scales its crops).
export async function uploadPicked(websiteId, images) {
  const picked = images.filter((image) => image.file);
  if (picked.length === 0) return new Map();
  const stored = await uploadImages(
    websiteId,
    picked.map((image) => image.file),
  );
  return new Map(picked.map((image, index) => [image.src, stored[index]]));
}
