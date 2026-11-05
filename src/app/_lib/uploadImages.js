// uploadImages: Submit's image uploads for a post or gallery, each picked file shrunk, one signature
// from our API, then each file to Cloudinary, 3 at a time, a failed one retried.

import { apiFetch } from "./apiFetch";
import { reportUploadFailure } from "./sentry";
import { shrinkImage } from "./shrinkImage";

const MAX_PARALLEL_UPLOADS = 3;
// The pauses before each retry: a failed upload is tried at most 3 times in all.
const RETRY_DELAYS_MS = [1000, 3000];
const ALL_FAILED_MESSAGE =
  "Your images couldn't be uploaded, please try again.";

// Shown under Submit when any upload failed. Cloudinary's own message is never shown to the site
// owner.
class UploadError extends Error {
  constructor(failed, total) {
    super(
      failed === total
        ? ALL_FAILED_MESSAGE
        : `${failed} of your ${total} images couldn't be uploaded. Press Submit to try ${failed === 1 ? "it" : "them"} again.`,
    );
    this.name = "UploadError";
  }
}

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One try of one file to Cloudinary, returning { stored } or { failure } (why it failed, never
// Cloudinary's message). Every entry of `fields` is sent unchanged (an extra or renamed signed
// parameter breaks the signature), then the file as "file". This is the one fetch outside
// apiFetch: it goes to Cloudinary, not our API, so it carries no credentials and no CSRF header.
async function uploadOne(uploadUrl, fields, file) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  form.append("file", file);

  let response;
  try {
    response = await fetch(uploadUrl, { method: "POST", body: form });
  } catch {
    return { failure: { reason: "network", retryable: true } };
  }
  if (!response.ok) {
    return {
      failure: {
        reason: `status ${response.status}`,
        retryable: response.status >= 500,
      },
    };
  }

  const { secure_url, width, height } = await response.json();
  return { stored: { src: secure_url, width, height } };
}

// Retries a network failure or a 5xx after each RETRY_DELAYS_MS pause, with the same signature
// (it lasts an hour). A 4xx is never retried: a refused signature or file won't fix itself.
async function uploadWithRetries(uploadUrl, fields, file) {
  let result = await uploadOne(uploadUrl, fields, file);
  for (const delay of RETRY_DELAYS_MS) {
    if (!result.failure?.retryable) break;
    await pause(delay);
    result = await uploadOne(uploadUrl, fields, file);
  }
  return result;
}

// files: the File objects to upload, all for the one website. Returns { stored, error }: stored
// holds each file's { src, width, height } as Cloudinary stored it, in the same order, or null for
// one that failed; error is an UploadError when any failed, else null. Every file is tried, so a
// failure keeps the others. onProgress hears each step as the progress dialog words it: "Preparing
// photos…" while the files shrink, then "Uploading photos (done of total)…" before the uploads and
// as each one is stored (fetch has no upload progress events). A failed sign throws its ApiError
// (a 401 has already redirected to sign-in) and uploads nothing.
async function uploadImages(websiteId, files, onProgress) {
  onProgress("Preparing photos…");
  const shrunk = await Promise.all(files.map(shrinkImage));

  const { uploadUrl, fields } = await apiFetch("/api/siteOwner/uploads/sign", {
    method: "POST",
    body: { websiteId },
  });

  const stored = new Array(shrunk.length).fill(null);
  const reasons = new Set();
  let done = 0;
  let next = 0;
  function reportUploads() {
    onProgress(`Uploading photos (${done} of ${shrunk.length})…`);
  }
  // Each worker takes the next file until none are left, so no more than MAX_PARALLEL_UPLOADS
  // uploads are ever in flight.
  async function worker() {
    while (next < shrunk.length) {
      const index = next;
      next += 1;
      const result = await uploadWithRetries(uploadUrl, fields, shrunk[index]);
      if (result.failure) {
        reasons.add(result.failure.reason);
        continue;
      }
      stored[index] = result.stored;
      done += 1;
      reportUploads();
    }
  }

  reportUploads();
  const workerCount = Math.min(MAX_PARALLEL_UPLOADS, shrunk.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  const failed = shrunk.length - done;
  if (failed === 0) return { stored, error: null };
  reportUploadFailure({ failed, total: shrunk.length, reasons: [...reasons] });
  return { stored, error: new UploadError(failed, shrunk.length) };
}

// images: a form's images, each { src, file? }, where a picked image's src is its object URL and
// file the File the site owner picked. Uploads the picked ones and returns { storedBySrc, error }:
// a Map from the object URL of each one that uploaded to its stored { src, width, height }, and the
// UploadError when any failed (see uploadImages). With nothing picked it signs nothing and reports
// nothing. The form swaps the stored ones in itself, before showing the error, so a retry uploads
// only the rest and the form can keep anything else on the image (a gallery scales its crops).
export async function uploadPicked(websiteId, images, onProgress) {
  const picked = images.filter((image) => image.file);
  if (picked.length === 0) return { storedBySrc: new Map(), error: null };
  const { stored, error } = await uploadImages(
    websiteId,
    picked.map((image) => image.file),
    onProgress,
  );
  const storedBySrc = new Map();
  picked.forEach((image, index) => {
    if (stored[index]) storedBySrc.set(image.src, stored[index]);
  });
  return { storedBySrc, error };
}
