// GalleryForm (site owner): Create a Gallery and Edit a Gallery, as a short run of dialogs
// (docs/flows.md → Create a Gallery), built like PostForm so the two flows read the same. One
// component for both, so the gallery's values, validation and payload building live in one place;
// every dialog is a PostStepDialog, and the parts below it (GalleryToolbar, GalleryPreview,
// ImageField, GalleryCropField) hold no gallery state of their own.
//
// mode "create" walks the steps: the Gallery Name (with the Website dropdown when the site owner
// has more than one website), then the optional title and copy, then the first image, then the
// review view. mode "edit" opens straight on the review view, with the gallery loaded. The review
// view shows Add Image, the GalleryPreview and the GalleryToolbar, with the Published switch
// (Create only) and Submit under the toolbar's list. Adding or editing one part opens its own
// dialog on top, working on a copy that only changes the gallery on Insert / Save. The gallery's
// mobile shape is the first mobile crop's; its toolbar row opens "Edit mobile shape", whose Save
// reshapes every mobile crop (reshapeCrop).
//
// A gallery's name is unique on its website, ignoring case: a name the website's other galleries
// have (from GET /api/siteOwner/websites) is refused before submit, and the backend's 409 is the
// fallback, shown under Submit.
//
// Cancelling the gallery asks first ("Are you sure…?"), except on the first step, where only a
// name is lost, and in Edit before anything has changed.
//
// Submit first uploads any newly picked images (uploadPicked), swaps in Cloudinary's src, width and
// height, and scales each new image's crops from the picked file's size to the stored size
// (scaleCrop), then saves: POST /api/siteOwner/galleries with the status, or
// PATCH /api/siteOwner/galleries/:id with the full form. If an upload fails nothing is saved;
// images already uploaded keep their Cloudinary src, so trying again doesn't upload them twice.
// useFormTimeout clears the form after 20 hours. The parent unmounts it in onClose or after
// onSuccess.

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormTimeout } from "../_hooks/useFormTimeout";
import PostStepDialog from "./PostStepDialog";
import GalleryPreview from "./GalleryPreview";
import GalleryToolbar from "./GalleryToolbar";
import ImageField, { releaseObjectUrl, serverErrorsFor } from "./ImageField";
import GalleryCropField from "./GalleryCropField";
import CharacterCount from "./CharacterCount";
import FieldLabel from "./FieldLabel";
import ConfirmDialog from "./ConfirmDialog";
import Toggle from "./Toggle";
import MessageDialog from "./MessageDialog";
import MobileShapePicker from "./MobileShapePicker";
import {
  GALLERY_NAME_TAKEN_MESSAGE,
  isBlank,
  takenGalleryNames,
  validateGallery,
  validateGalleryImage,
} from "../_lib/validation";
import { uploadPicked } from "../_lib/uploadImages";
import {
  cropIssues,
  cropRules,
  imageCropIssues,
  reshapeCrop,
  scaleCrop,
  shapeOf,
} from "../_lib/crops";
import {
  GALLERY_FIELDS,
  MAX_CAPTION,
  MAX_GALLERY_IMAGES,
  OPTIONAL_GALLERY_FIELDS,
} from "../_lib/galleryFields";

import styles from "../_styling/postForm.module.css";
import previewStyles from "../_styling/postPreview.module.css";

const EMPTY_GALLERY = {
  galleryName: "",
  title: "",
  copy: "",
  images: [],
};

// A new image has no file yet; src, width and height are set together once one is picked.
const EMPTY_IMAGE = {
  src: "",
  width: null,
  height: null,
  altText: "",
  caption: "",
  thumbnailCrop: null,
  mobileCrop: null,
};

const TIMED_OUT_MESSAGE =
  "This form was open for 20 hours, so it timed out. Nothing was saved. Please open it again.";

// Form values for a Gallery loaded by useGallery: nulls become "", so every input is controlled.
// Each image keeps its id (and uses it as its key), src, size and crops.
export function galleryToFormValues(gallery) {
  return {
    galleryName: gallery.galleryName,
    title: gallery.title ?? "",
    copy: gallery.copy ?? "",
    images: gallery.images.map((image) => ({
      key: image.id,
      id: image.id,
      src: image.src,
      width: image.width,
      height: image.height,
      altText: image.altText,
      caption: image.caption ?? "",
      thumbnailCrop: image.thumbnailCrop,
      mobileCrop: image.mobileCrop,
    })),
  };
}

// Lets go of a draft image's picked file when the gallery doesn't show it (a new image, or a file
// picked to replace one): nothing else would. The gallery's own images are let go of with it.
function releaseDraftOnly(image, images) {
  const stored = images.find((item) => item.key === image.key);
  if (stored?.src !== image.src) releaseObjectUrl(image.src);
}

// Every object URL the form holds: the gallery's images', and the open dialog's picked file.
function releaseAll(images, editing) {
  images.forEach((image) => releaseObjectUrl(image.src));
  if (editing?.image) releaseDraftOnly(editing.image, images);
}

// Optional text: trimmed, or null when blank.
function optional(value) {
  return isBlank(value) ? null : value.trim();
}

// One image in the contract's shape, once it is uploaded. The client-only key is dropped, id is
// only sent for an image that already exists, and a missing crop is null.
function toImagePayload(image) {
  const { id, src, width, height, altText, caption } = image;
  return {
    ...(id ? { id } : {}),
    src,
    width,
    height,
    altText: altText.trim(),
    caption: optional(caption),
    thumbnailCrop: image.thumbnailCrop ?? null,
    mobileCrop: image.mobileCrop ?? null,
  };
}

function toPayload(values) {
  return {
    galleryName: values.galleryName.trim(),
    title: optional(values.title),
    copy: optional(values.copy),
    images: values.images.map(toImagePayload),
  };
}

// One of the gallery's own fields (GALLERY_FIELDS): its label and help text (FieldLabel, with its
// character count right above the input), the input (a textarea for the copy), and its message.
function GalleryField({ field, value, onChange, onBlur, message }) {
  const id = useId();
  const { label, max, note, multiline } = GALLERY_FIELDS[field];
  const inputProps = {
    id,
    maxLength: max,
    "aria-describedby": `${id}-count`,
    value,
    onChange: (e) => onChange(e.target.value),
    onBlur,
  };
  return (
    <>
      <FieldLabel
        htmlFor={id}
        label={label}
        note={note}
        count={<CharacterCount id={`${id}-count`} value={value} max={max} />}
      />
      {multiline ? (
        <textarea rows={6} {...inputProps} />
      ) : (
        <input type="text" {...inputProps} />
      )}
      {message && <p className="fieldError">{message}</p>}
    </>
  );
}

export default function GalleryForm({
  mode,
  websites = [],
  websiteId: galleryWebsiteId,
  galleryId,
  initialValues = EMPTY_GALLERY,
  onSubmit,
  onSuccess,
  onClose,
}) {
  const isCreate = mode === "create";
  const captionId = useId();

  // Edit is given the gallery's website; Create picks one, chosen silently when there is only one.
  const [websiteId, setWebsiteId] = useState(
    galleryWebsiteId ?? (websites.length === 1 ? websites[0].id : ""),
  );
  const [values, setValues] = useState(initialValues);
  // A new gallery is published unless the site owner switches it to draft.
  const [status, setStatus] = useState("published");

  // Create walks name → details → firstImage → review; Edit starts on review.
  const [step, setStep] = useState(isCreate ? "name" : "review");
  // The dialog adding or editing one part of the gallery, or null: { field, value } for one of
  // its own fields, { image } for an image (a new one isn't in the gallery yet), or
  // { mobileShape } for the gallery's mobile shape. It holds the working copy until Save / Insert.
  const [editing, setEditing] = useState(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // Whether the gallery has changed since the review view opened, so Edit only asks before
  // closing once there is something to lose.
  const [changed, setChanged] = useState(false);

  // Fields the site owner has left at least once; only their messages are shown.
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [timedOut, setTimedOut] = useState(false);

  const { images } = values;

  // Picked files are shown from object URLs, let go of when the form closes. The refs follow the
  // images and the open dialog so the cleanup on unmount sees them as they are then.
  const imagesRef = useRef(images);
  const editingRef = useRef(editing);
  useEffect(() => {
    imagesRef.current = images;
    editingRef.current = editing;
  });
  useEffect(() => () => releaseAll(imagesRef.current, editingRef.current), []);

  // The picked files leave memory, and only the timed-out message shows.
  useFormTimeout(() => {
    releaseAll(images, editing);
    setValues((current) => ({ ...current, images: [] }));
    setEditing(null);
    setTimedOut(true);
  });

  const takenNames = takenGalleryNames(
    websites.find((website) => website.id === websiteId),
    galleryId,
  );
  const validateOptions = { requireWebsite: isCreate, takenNames };
  const errors = validateGallery({ websiteId, ...values }, validateOptions);
  // Each image is valid on its own here: it only joins the gallery through Insert, which waits for
  // its checks, and the only image can't be deleted. Together, their crops must still be
  // consistent (every image or none has each crop, one mobile shape), which adding a crop to one
  // image, or removing it from one, can break.
  const crops = cropIssues(images);
  // The gallery's mobile shape: the first mobile crop's, or null before there is one.
  const firstMobileCrop = images.find((image) => image.mobileCrop)?.mobileCrop;
  const mobileShape = firstMobileCrop ? shapeOf(firstMobileCrop) : null;
  const isValid =
    Object.keys(errors).length === 0 && crops.messages.length === 0;
  const fieldErrors = serverError?.fields ?? {};
  // Submit names the step it is on; the line under it is only for a failure's message.
  let progress = null;
  if (uploading) progress = "Uploading images…";
  else if (submitting) progress = "Submitting…";

  const imagesFull = images.length >= MAX_GALLERY_IMAGES;

  function touch(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  // A field's message: the form's own once the field has been left, otherwise the backend's. A
  // taken name shows straight away, since no more typing makes it free.
  function messageFor(field, ownErrors = errors) {
    const isTaken = ownErrors[field] === GALLERY_NAME_TAKEN_MESSAGE;
    if ((touched[field] || isTaken) && ownErrors[field])
      return ownErrors[field];
    return fieldErrors[field];
  }

  // Typing in a step: the values change, but nothing is "changed" until the review view.
  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  // Every change made from the review view.
  function updateGallery(update) {
    setValues(update);
    setChanged(true);
  }

  // Drops the backend's messages whose path matches, once what they described has changed.
  function dropServerErrors(matches) {
    setServerError((current) => {
      if (!current?.fields) return current;
      const fields = Object.fromEntries(
        Object.entries(current.fields).filter(([path]) => !matches(path)),
      );
      return { ...current, fields };
    });
  }

  // Adding, moving or deleting an image shifts the indices the server's "images.N.…" messages
  // point at, so those messages are dropped rather than shown on the wrong image. The list's own
  // message ("images") is dropped too: it was about the list as it was.
  function clearImageErrors() {
    dropServerErrors((path) => /^images(\.\d+\.|$)/.test(path));
  }

  // --- Cancelling the gallery -----------------------------------------------------------------

  // Cancel or Esc on a step or the first image; the X or Esc on the review view.
  function requestCancel() {
    if (step === "name" || (!isCreate && !changed)) {
      onClose();
      return;
    }
    setConfirmingCancel(true);
  }

  // --- The dialogs for one part of the gallery -------------------------------------------------

  function addImage() {
    setEditing({ image: { ...EMPTY_IMAGE, key: crypto.randomUUID() } });
  }

  // Cancel in one part's dialog: the gallery stays as it was.
  function cancelEditing() {
    if (editing.image) releaseDraftOnly(editing.image, images);
    setEditing(null);
  }

  function saveField() {
    const { field, value } = editing;
    updateGallery((current) => ({ ...current, [field]: value }));
    dropServerErrors((path) => path === field);
    setEditing(null);
  }

  // A functional update, so a picked file that finishes loading late patches the copy as it is
  // then. A newer pick replaces an older picked file the gallery never showed, and clears both
  // crops: they were drawn on the image it replaces.
  function patchImage(changes) {
    if (changes.src) releaseDraftOnly(editing.image, images);
    const cropReset = changes.src
      ? { thumbnailCrop: null, mobileCrop: null }
      : {};
    setEditing((current) => ({
      image: { ...current.image, ...changes, ...cropReset },
    }));
  }

  // Insert: an image already in the gallery is replaced in place; a new one goes on the end. The
  // first image's Insert also leads on to the review view.
  function insertImage() {
    const { image } = editing;
    const index = images.findIndex((item) => item.key === image.key);
    if (index === -1) {
      updateGallery((current) => ({
        ...current,
        images: [...current.images, image],
      }));
      clearImageErrors();
    } else {
      if (images[index].src !== image.src) releaseObjectUrl(images[index].src);
      updateGallery((current) => ({
        ...current,
        images: current.images.map((item) =>
          item.key === image.key ? image : item,
        ),
      }));
      dropServerErrors((path) => path.startsWith(`images.${index}.`));
    }
    setEditing(null);
    if (step === "firstImage") setStep("review");
  }

  // offset is -1 (up) or 1 (down); the toolbar only offers a move the image can make.
  function moveImage(index, offset) {
    updateGallery((current) => {
      const next = [...current.images];
      const [image] = next.splice(index, 1);
      next.splice(index + offset, 0, image);
      return { ...current, images: next };
    });
    clearImageErrors();
  }

  function deleteImage(image) {
    releaseObjectUrl(image.src);
    updateGallery((current) => ({
      ...current,
      images: current.images.filter((item) => item.key !== image.key),
    }));
    clearImageErrors();
  }

  function deleteField(field) {
    updateGallery((current) => ({ ...current, [field]: "" }));
    dropServerErrors((path) => path === field);
  }

  // A new mobile shape for the whole gallery: every mobile crop is redrawn in it around its own
  // centre (reshapeCrop, in its image's own pixels), so none is lost and all share the shape. The
  // backend's messages about the images described them as they were, so they are dropped.
  function saveMobileShape() {
    const { aspect } = editing.mobileShape;
    updateGallery((current) => ({
      ...current,
      images: current.images.map((image) =>
        image.mobileCrop
          ? {
              ...image,
              mobileCrop: reshapeCrop(image.mobileCrop, aspect, {
                width: image.width,
                height: image.height,
              }),
            }
          : image,
      ),
    }));
    clearImageErrors();
    setEditing(null);
  }

  // --- Submit ------------------------------------------------------------------------------------

  // Uploads every image with a picked file and returns the images with their Cloudinary src, width
  // and height in place of the file, and their crops scaled from the picked file's size to the
  // stored size. The same swap goes into the form, as a functional update that skips an image
  // whose file was changed or deleted meanwhile, so a retry sends the stored crops as they are.
  async function uploadNewImages() {
    const newImages = images.filter((image) => image.file);
    if (newImages.length === 0) return images;

    setUploading(true);
    let storedBySrc;
    try {
      storedBySrc = await uploadPicked(websiteId, newImages);
    } finally {
      setUploading(false);
    }

    function swap(image) {
      const stored = storedBySrc.get(image.src);
      if (!stored) return image;
      const { file: _file, ...rest } = image;
      const picked = { width: image.width, height: image.height };
      return {
        ...rest,
        ...stored,
        thumbnailCrop: scaleCrop(
          image.thumbnailCrop,
          picked,
          stored,
          "thumbnail",
        ),
        mobileCrop: scaleCrop(image.mobileCrop, picked, stored, "mobile"),
      };
    }
    newImages.forEach((image) => releaseObjectUrl(image.src));
    setValues((current) => ({ ...current, images: current.images.map(swap) }));
    return images.map(swap);
  }

  async function handleSubmit() {
    // The button is disabled while invalid or submitting; this also catches a second click that
    // lands before the re-render.
    if (!isValid || submitting) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const payload = toPayload({ ...values, images: await uploadNewImages() });
      const gallery = await onSubmit(
        isCreate ? { websiteId, ...payload, status } : payload,
      );
      onSuccess(gallery);
    } catch (err) {
      // Everything entered stays. A failed upload throws its own message, a failed sign or save
      // the backend's (a taken name's 409 among them).
      setServerError({ message: err.message, fields: err.fields });
      setSubmitting(false);
    }
  }

  // --- Rendering ---------------------------------------------------------------------------------

  function renderNameStep() {
    return (
      <PostStepDialog
        title="Name your gallery"
        primaryLabel="Next"
        primaryDisabled={Boolean(errors.websiteId || errors.galleryName)}
        onPrimary={() => setStep("details")}
        onCancel={requestCancel}
      >
        {websites.length > 1 && (
          <section className={styles.websiteSection}>
            <label htmlFor="gallery-website">Website</label>
            <select
              id="gallery-website"
              value={websiteId}
              onChange={(e) => setWebsiteId(e.target.value)}
              onBlur={() => touch("websiteId")}
              className={styles.websiteDropdown}
            >
              <option value="">Choose a website</option>
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.websiteName}
                </option>
              ))}
            </select>
            {messageFor("websiteId") && (
              <p className="fieldError">{messageFor("websiteId")}</p>
            )}
          </section>
        )}
        <GalleryField
          field="galleryName"
          value={values.galleryName}
          onChange={(value) => setField("galleryName", value)}
          onBlur={() => touch("galleryName")}
          message={messageFor("galleryName")}
        />
      </PostStepDialog>
    );
  }

  function renderDetailsStep() {
    return (
      <PostStepDialog
        title="Gallery details"
        note="These fields are optional."
        primaryLabel="Next"
        primaryDisabled={OPTIONAL_GALLERY_FIELDS.some((field) => errors[field])}
        onPrimary={() => {
          setStep("firstImage");
          addImage();
        }}
        onCancel={requestCancel}
      >
        {OPTIONAL_GALLERY_FIELDS.map((field) => (
          <GalleryField
            key={field}
            field={field}
            value={values[field]}
            onChange={(value) => setField(field, value)}
            onBlur={() => touch(field)}
            message={messageFor(field)}
          />
        ))}
      </PostStepDialog>
    );
  }

  function renderReview() {
    return (
      <PostStepDialog
        title={isCreate ? "Create a Gallery" : "Edit Gallery"}
        className={previewStyles.reviewDialog}
        onCancel={requestCancel}
        withCloseButton
      >
        <div className={previewStyles.reviewLayout}>
          <div className={previewStyles.addButtons}>
            <button type="button" disabled={imagesFull} onClick={addImage}>
              Add Image
            </button>
            {imagesFull && <p>Maximum of {MAX_GALLERY_IMAGES} images</p>}
          </div>
          <div className={previewStyles.previewColumn}>
            <GalleryPreview
              title={values.title}
              copy={values.copy}
              images={images}
            />
          </div>
          <GalleryToolbar
            values={values}
            fieldErrors={fieldErrors}
            cropIssues={crops}
            mobileShape={mobileShape}
            onEditMobileShape={() => setEditing({ mobileShape })}
            onEditField={(field) => setEditing({ field, value: values[field] })}
            onDeleteField={deleteField}
            onEditImage={(image) => setEditing({ image: { ...image } })}
            onMoveImage={moveImage}
            onDeleteImage={deleteImage}
          >
            {isCreate && (
              <div className={styles.statusSection}>
                {/* A heading for the section, not the switch's label: the switch is named
                    "Published" so screen readers announce what "on" means. */}
                <p className={styles.statusHeader}>Status</p>
                <p className={styles.message}>
                  <i>
                    *Set a gallery to published for it to be live on your
                    website, or draft to save it and publish it at a later date.
                  </i>
                </p>
                <Toggle
                  label="Published"
                  statusColors
                  offLabel="draft"
                  onLabel="published"
                  checked={status === "published"}
                  onChange={(published) =>
                    setStatus(published ? "published" : "draft")
                  }
                />
              </div>
            )}
            <button
              type="button"
              disabled={!isValid || submitting}
              onClick={handleSubmit}
            >
              {progress ?? "Submit"}
            </button>
            {/* A disabled button's new label isn't reliably announced, so screen readers hear
                the progress from here. */}
            <p role="status" className={styles.visuallyHidden}>
              {progress}
            </p>
            {serverError?.message && <p>{serverError.message}</p>}
          </GalleryToolbar>
        </div>
      </PostStepDialog>
    );
  }

  // The gallery's mobile shape, from its toolbar row: changing it reshapes every mobile crop.
  function renderMobileShapeDialog() {
    return (
      <PostStepDialog
        title="Edit mobile shape"
        note="Changing the shape reshapes every image's mobile crop around its centre. You can adjust each one afterwards."
        primaryLabel="Save"
        primaryDisabled={editing.mobileShape === mobileShape}
        onPrimary={saveMobileShape}
        onCancel={() => setEditing(null)}
      >
        <MobileShapePicker
          value={editing.mobileShape}
          onChange={(shape) => setEditing({ mobileShape: shape })}
        />
      </PostStepDialog>
    );
  }

  // One of the gallery's own fields, from its toolbar row: Add while it is empty, Edit once it has
  // a value.
  function renderFieldDialog() {
    const { field, value } = editing;
    const ownErrors = validateGallery(
      { ...values, [field]: value },
      {
        takenNames,
      },
    );
    const verb = isBlank(values[field]) ? "Add" : "Edit";
    return (
      <PostStepDialog
        title={`${verb} ${GALLERY_FIELDS[field].name}`}
        primaryLabel="Save"
        primaryDisabled={Boolean(ownErrors[field])}
        onPrimary={saveField}
        onCancel={cancelEditing}
      >
        <GalleryField
          field={field}
          value={value}
          onChange={(next) => setEditing({ field, value: next })}
          onBlur={() => touch(field)}
          message={messageFor(field, ownErrors)}
        />
      </PostStepDialog>
    );
  }

  // An image: the first image's step, or Add / Edit from the review view.
  function renderImageDialog() {
    const { image } = editing;
    const index = images.findIndex((item) => item.key === image.key);
    const isNew = index === -1;
    const imageErrors = isNew
      ? {}
      : serverErrorsFor(fieldErrors, `images.${index}.`);
    const ownErrors = validateGalleryImage(image);
    // What the gallery's other images ask of this one's crops: Insert waits for them too.
    const rules = cropRules(images, image.key);
    const cropProblems = imageCropIssues(image, rules);

    // The first image is a step of Create: cancelling it cancels the gallery.
    const isFirst = step === "firstImage";
    let title = isNew ? "Add an image" : "Edit image";
    if (isFirst) title = "Add your first image";
    return (
      <PostStepDialog
        title={title}
        note={isFirst ? "One image is required for a gallery." : undefined}
        primaryLabel="Insert"
        primaryDisabled={
          Object.keys(ownErrors).length > 0 || cropProblems.length > 0
        }
        onPrimary={insertImage}
        onCancel={isFirst ? requestCancel : cancelEditing}
      >
        <ImageField
          value={image}
          onPatch={patchImage}
          serverErrors={imageErrors}
        />
        <FieldLabel
          htmlFor={captionId}
          label="Caption"
          note="Optional. Shown with the image on your website."
          count={
            <CharacterCount
              id={`${captionId}-count`}
              value={image.caption}
              max={MAX_CAPTION}
            />
          }
        />
        <input
          id={captionId}
          type="text"
          maxLength={MAX_CAPTION}
          aria-describedby={`${captionId}-count`}
          value={image.caption}
          onChange={(e) => patchImage({ caption: e.target.value })}
          className={styles.input}
        />
        {(ownErrors.caption || imageErrors.caption) && (
          <p className="fieldError">
            {ownErrors.caption ?? imageErrors.caption}
          </p>
        )}
        <GalleryCropField
          image={image}
          rules={rules}
          onPatch={patchImage}
          serverErrors={imageErrors}
        />
      </PostStepDialog>
    );
  }

  if (timedOut) {
    return <MessageDialog message={TIMED_OUT_MESSAGE} onClose={onClose} />;
  }

  return (
    <>
      {step === "name" && renderNameStep()}
      {step === "details" && renderDetailsStep()}
      {step === "review" && renderReview()}
      {editing?.field && renderFieldDialog()}
      {editing?.mobileShape && renderMobileShapeDialog()}
      {editing?.image && renderImageDialog()}
      {confirmingCancel && (
        <ConfirmDialog
          message={
            isCreate
              ? "Are you sure you want to cancel creating this gallery?"
              : "Are you sure you want to cancel your changes?"
          }
          confirmLabel={isCreate ? "Yes, cancel" : "Discard changes"}
          cancelLabel="Keep editing"
          onConfirm={onClose}
          onClose={() => setConfirmingCancel(false)}
        />
      )}
    </>
  );
}
