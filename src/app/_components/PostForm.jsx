// PostForm (site owner): Create a Post and Edit a Post, as a short run of dialogs (docs/flows.md →
// Create a Post). One component for both, so the post's values, validation and payload building
// live in one place; every dialog is a PostStepDialog, and the parts below it (PostToolbar,
// ParagraphField, ImageField) hold no post state of their own.
//
// mode "create" walks the steps: the Post Name (with the Website dropdown when the site owner has
// more than one website; with one it is chosen silently), then the optional date, header and sub
// header, then the first paragraph, then the review view. mode "edit" opens straight on the
// review view, with the post loaded. The review view shows the Add buttons (Add Paragraph, Add
// Image), the PostPreview and the PostToolbar (every part of the post with its ⋮ menu), with the
// Published switch (Create only) and Submit under the toolbar's list. Adding or editing one part
// opens its own dialog on top, working on a copy (editing) that only changes the post on Insert /
// Save, so its Cancel leaves the post as it was. The first paragraph is that same paragraph
// dialog, as a step of its own.
//
// Cancelling the post (Cancel or Esc on a step, or the X or Esc on the review view) drops everything, so it
// asks first ("Are you sure…?"), except on the first step, where only a name is lost, and in Edit
// before anything has changed.
//
// Submit first uploads any newly picked images (uploadImages: one signature, then each file to
// Cloudinary) and swaps their Cloudinary src, width and height into the body, then saves:
// POST /api/siteOwner/posts with the status, or PATCH /api/siteOwner/posts/:id with the full form.
// If an upload fails nothing is saved; images already uploaded keep their Cloudinary src, so
// trying again doesn't upload them twice. While it works, Submit reads "Uploading images…" and
// then "Submitting…". useFormTimeout clears the form after 20 hours. The parent unmounts it in
// onClose or after onSuccess.

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormTimeout } from "../_hooks/useFormTimeout";
import PostStepDialog from "./PostStepDialog";
import PostPreview from "./PostPreview";
import PostToolbar from "./PostToolbar";
import ParagraphField from "./ParagraphField";
import ImageField, { releaseObjectUrl, serverErrorsFor } from "./ImageField";
import CharacterCount from "./CharacterCount";
import FieldLabel from "./FieldLabel";
import ConfirmDialog from "./ConfirmDialog";
import Toggle from "./Toggle";
import MessageDialog from "./MessageDialog";
import {
  isBlank,
  validateImage,
  validateParagraph,
  validatePost,
} from "../_lib/validation";
import { uploadImages } from "../_lib/uploadImages";
import { elementNames, OPTIONAL_FIELDS, POST_FIELDS } from "../_lib/postFields";

import styles from "../_styling/postForm.module.css";
import previewStyles from "../_styling/postPreview.module.css";

const EMPTY_POST = {
  postName: "",
  postDate: "",
  header: "",
  subHeader: "",
  body: [],
};

const MAX_PARAGRAPHS = 5;
const MAX_IMAGES = 5;

const EMPTY_PARAGRAPH = { type: "paragraph", text: "" };
// A new image has no file yet; src, width and height are set together once one is picked.
const EMPTY_IMAGE = {
  type: "image",
  src: "",
  width: null,
  height: null,
  altText: "",
};

const TIMED_OUT_MESSAGE =
  "This form was open for 20 hours, so it timed out. Nothing was saved. Please open it again.";

// Form values for a Post loaded by usePost: nulls become "", so every input is controlled. Body
// elements are flattened; paragraphs have no id, so they get a fresh key. Existing images keep
// their id (and use it as their key), src and size.
export function postToFormValues(post) {
  return {
    postName: post.postName,
    postDate: post.postDate ?? "",
    header: post.header ?? "",
    subHeader: post.subHeader ?? "",
    body: post.body.map((element) => {
      if (element.type === "paragraph") {
        return {
          key: crypto.randomUUID(),
          type: "paragraph",
          text: element.text,
        };
      }
      const { image } = element;
      return {
        key: image.id,
        type: "image",
        id: image.id,
        src: image.src,
        width: image.width,
        height: image.height,
        altText: image.altText,
      };
    }),
  };
}

// Lets go of a picked image's object URL (a stored image needs nothing).
function releaseImage(element) {
  if (element.type === "image") releaseObjectUrl(element.src);
}

// Lets go of a draft image's picked file when the post doesn't show it (a new image, or a file
// picked to replace one): nothing else would. The post's own images are let go of with the body.
function releaseDraftOnly(element, body) {
  if (element.type !== "image") return;
  const stored = body.find((item) => item.key === element.key);
  if (stored?.src !== element.src) releaseObjectUrl(element.src);
}

// Every object URL the form holds: the body's, and the open dialog's picked file.
function releaseAll(body, editing) {
  body.forEach(releaseImage);
  if (editing?.element) releaseDraftOnly(editing.element, body);
}

// Optional text: trimmed, or null when blank.
function optional(value) {
  return isBlank(value) ? null : value.trim();
}

// One body element in the contract's shape. A paragraph is trimmed only at its ends, so the
// line breaks and formatting markup inside it are kept as typed.
function toElementPayload(element) {
  if (element.type === "paragraph") {
    return { type: "paragraph", text: element.text.trim() };
  }
  const { id, src, width, height, altText } = element;
  return {
    type: "image",
    image: {
      ...(id ? { id } : {}),
      src,
      width,
      height,
      altText: altText.trim(),
    },
  };
}

// Builds the request body from a body whose new images are already uploaded. The client-only
// key is dropped, and id is only sent for images that already exist.
function toPayload(values) {
  return {
    postName: values.postName.trim(),
    header: optional(values.header),
    subHeader: optional(values.subHeader),
    postDate: optional(values.postDate),
    body: values.body.map(toElementPayload),
  };
}

// One of the post's own fields (POST_FIELDS): its label and help text (FieldLabel, with a
// character count right above the input when it has a limit), the input, and its message.
function PostField({ field, value, onChange, onBlur, message }) {
  const id = useId();
  const { label, type, max, note } = POST_FIELDS[field];
  return (
    <>
      <FieldLabel
        htmlFor={id}
        label={label}
        note={note}
        count={
          max && <CharacterCount id={`${id}-count`} value={value} max={max} />
        }
      />
      <input
        id={id}
        type={type}
        maxLength={max}
        aria-describedby={max ? `${id}-count` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {message && <p className="fieldError">{message}</p>}
    </>
  );
}

export default function PostForm({
  mode,
  websites = [],
  websiteId: postWebsiteId,
  initialValues = EMPTY_POST,
  onSubmit,
  onSuccess,
  onClose,
}) {
  const isCreate = mode === "create";

  // Edit is given the post's website; Create picks one, chosen silently when there is only one.
  const [websiteId, setWebsiteId] = useState(
    postWebsiteId ?? (websites.length === 1 ? websites[0].id : ""),
  );
  const [values, setValues] = useState(initialValues);
  // A new post is published unless the site owner switches it to draft.
  const [status, setStatus] = useState("published");

  // Create walks name → details → firstParagraph → review; Edit starts on review.
  const [step, setStep] = useState(isCreate ? "name" : "review");
  // The dialog adding or editing one part of the post, or null: { field, value } for one of the
  // post's own fields, or { element } for a paragraph or an image (a new one isn't in the body
  // yet). It holds the working copy until Save / Insert.
  const [editing, setEditing] = useState(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // Whether the post has changed since the review view opened, so Edit only asks before closing
  // once there is something to lose.
  const [changed, setChanged] = useState(false);

  // Fields the site owner has left at least once; only their messages are shown.
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [timedOut, setTimedOut] = useState(false);

  const { body } = values;

  // Picked files are shown from object URLs, let go of when the form closes. The refs follow the
  // body and the open dialog so the cleanup on unmount sees them as they are then.
  const bodyRef = useRef(body);
  const editingRef = useRef(editing);
  useEffect(() => {
    bodyRef.current = body;
    editingRef.current = editing;
  });
  useEffect(() => () => releaseAll(bodyRef.current, editingRef.current), []);

  // The picked files leave memory, and only the timed-out message shows.
  useFormTimeout(() => {
    releaseAll(body, editing);
    setValues((current) => ({ ...current, body: [] }));
    setEditing(null);
    setTimedOut(true);
  });

  const errors = validatePost(
    { websiteId, ...values },
    { requireWebsite: isCreate },
  );
  // The body is always valid here: an element only joins it through Insert, which waits for its
  // checks, and its one required paragraph can't be deleted.
  const isValid = Object.keys(errors).length === 0;
  const fieldErrors = serverError?.fields ?? {};
  // Submit names the step it is on; the line under it is only for a failure's message.
  let progress = null;
  if (uploading) progress = "Uploading images…";
  else if (submitting) progress = "Submitting…";

  const paragraphCount = body.filter(
    (element) => element.type === "paragraph",
  ).length;
  const paragraphsFull = paragraphCount >= MAX_PARAGRAPHS;
  const imagesFull = body.length - paragraphCount >= MAX_IMAGES;

  function touch(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  // A field's message: the form's own once the field has been left, otherwise the backend's.
  function messageFor(field, ownErrors = errors) {
    if (touched[field] && ownErrors[field]) return ownErrors[field];
    return fieldErrors[field];
  }

  // Typing in a step: the values change, but nothing is "changed" until the review view.
  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  // Every change made from the review view.
  function updatePost(update) {
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

  // Adding, moving or deleting a body element shifts the indices the server's "body.N.…"
  // messages point at, so those messages are dropped rather than shown on the wrong element.
  // The list's own message ("body") is dropped too: it was about the list as it was.
  function clearItemErrors() {
    dropServerErrors((path) => /^body(\.\d+\.|$)/.test(path));
  }

  // --- Cancelling the post --------------------------------------------------------------------

  // Cancel or Esc on a step or the first paragraph; the X or Esc on the review view.
  function requestCancel() {
    if (step === "name" || (!isCreate && !changed)) {
      onClose();
      return;
    }
    setConfirmingCancel(true);
  }

  // --- The dialogs for one part of the post ----------------------------------------------------

  function addElement(emptyElement) {
    setEditing({ element: { ...emptyElement, key: crypto.randomUUID() } });
  }

  // Cancel in one part's dialog: the post stays as it was.
  function cancelEditing() {
    if (editing.element) releaseDraftOnly(editing.element, body);
    setEditing(null);
  }

  function saveField() {
    const { field, value } = editing;
    updatePost((current) => ({ ...current, [field]: value }));
    dropServerErrors((path) => path === field);
    setEditing(null);
  }

  // A functional update, so a picked file that finishes loading late patches the copy as it is
  // then. A newer pick replaces an older picked file the post never showed.
  function patchElement(changes) {
    if (changes.src) releaseDraftOnly(editing.element, body);
    setEditing((current) => ({
      element: { ...current.element, ...changes },
    }));
  }

  // Insert: an element already in the body is replaced in place; a new one goes on the end. The
  // first paragraph's Insert also leads on to the review view.
  function insertElement() {
    const { element } = editing;
    const index = body.findIndex((item) => item.key === element.key);
    if (index === -1) {
      updatePost((current) => ({
        ...current,
        body: [...current.body, element],
      }));
      clearItemErrors();
    } else {
      if (body[index].src !== element.src) releaseImage(body[index]);
      updatePost((current) => ({
        ...current,
        body: current.body.map((item) =>
          item.key === element.key ? element : item,
        ),
      }));
      dropServerErrors((path) => path.startsWith(`body.${index}.`));
    }
    setEditing(null);
    if (step === "firstParagraph") setStep("review");
  }

  // offset is -1 (up) or 1 (down); the toolbar only offers a move the element can make.
  function moveElement(index, offset) {
    updatePost((current) => {
      const next = [...current.body];
      const [element] = next.splice(index, 1);
      next.splice(index + offset, 0, element);
      return { ...current, body: next };
    });
    clearItemErrors();
  }

  function deleteElement(element) {
    releaseImage(element);
    updatePost((current) => ({
      ...current,
      body: current.body.filter((item) => item.key !== element.key),
    }));
    clearItemErrors();
  }

  function deleteField(field) {
    updatePost((current) => ({ ...current, [field]: "" }));
    dropServerErrors((path) => path === field);
  }

  // --- Submit ------------------------------------------------------------------------------------

  // Uploads every image with a picked file and returns the body with their Cloudinary src, width
  // and height in place of the file. The same swap goes into the form, as a functional update
  // that skips an image whose file was changed or deleted meanwhile.
  async function uploadNewImages() {
    const newImages = body.filter((element) => element.file);
    if (newImages.length === 0) return body;

    setUploading(true);
    let stored;
    try {
      stored = await uploadImages(
        websiteId,
        newImages.map((element) => element.file),
      );
    } finally {
      setUploading(false);
    }

    const storedBySrc = new Map(
      newImages.map((element, index) => [element.src, stored[index]]),
    );
    function swap(element) {
      const image = storedBySrc.get(element.src);
      if (!image) return element;
      const { file: _file, ...rest } = element;
      return { ...rest, ...image };
    }
    newImages.forEach(releaseImage);
    setValues((current) => ({ ...current, body: current.body.map(swap) }));
    return body.map(swap);
  }

  async function handleSubmit() {
    // The button is disabled while invalid or submitting; this also catches a second click that
    // lands before the re-render.
    if (!isValid || submitting) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const payload = toPayload({ ...values, body: await uploadNewImages() });
      const post = await onSubmit(
        isCreate ? { websiteId, ...payload, status } : payload,
      );
      onSuccess(post);
    } catch (err) {
      // Everything entered stays. A failed upload throws its own message, a failed sign or save
      // the backend's.
      setServerError({ message: err.message, fields: err.fields });
      setSubmitting(false);
    }
  }

  // --- Rendering ---------------------------------------------------------------------------------

  function renderNameStep() {
    return (
      <PostStepDialog
        title="Name your post"
        primaryLabel="Next"
        primaryDisabled={Boolean(errors.websiteId || errors.postName)}
        onPrimary={() => setStep("details")}
        onCancel={requestCancel}
      >
        {websites.length > 1 && (
          <section className={styles.websiteSection}>
            <label htmlFor="post-website">Website</label>
            <select
              id="post-website"
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
        <PostField
          field="postName"
          value={values.postName}
          onChange={(value) => setField("postName", value)}
          onBlur={() => touch("postName")}
          message={messageFor("postName")}
        />
      </PostStepDialog>
    );
  }

  function renderDetailsStep() {
    return (
      <PostStepDialog
        title="Post details"
        note="These fields are optional."
        primaryLabel="Next"
        primaryDisabled={OPTIONAL_FIELDS.some((field) => errors[field])}
        onPrimary={() => {
          setStep("firstParagraph");
          addElement(EMPTY_PARAGRAPH);
        }}
        onCancel={requestCancel}
      >
        {OPTIONAL_FIELDS.map((field) => (
          <PostField
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
        title={isCreate ? "Create a Post" : "Edit Post"}
        className={previewStyles.reviewDialog}
        onCancel={requestCancel}
        withCloseButton
      >
        <div className={previewStyles.reviewLayout}>
          <div className={previewStyles.addButtons}>
            <button
              type="button"
              disabled={paragraphsFull}
              onClick={() => addElement(EMPTY_PARAGRAPH)}
            >
              Add Paragraph
            </button>
            {paragraphsFull && <p>Maximum of {MAX_PARAGRAPHS} paragraphs</p>}
            <button
              type="button"
              disabled={imagesFull}
              onClick={() => addElement(EMPTY_IMAGE)}
            >
              Add Image
            </button>
            {imagesFull && <p>Maximum of {MAX_IMAGES} images</p>}
          </div>
          <div className={previewStyles.previewColumn}>
            <PostPreview
              header={values.header}
              subHeader={values.subHeader}
              postDate={values.postDate}
              body={body}
            />
          </div>
          <PostToolbar
            values={values}
            fieldErrors={fieldErrors}
            onEditField={(field) => setEditing({ field, value: values[field] })}
            onDeleteField={deleteField}
            onEditElement={(element) => setEditing({ element: { ...element } })}
            onMoveElement={moveElement}
            onDeleteElement={deleteElement}
          >
            {isCreate && (
              <div className={styles.statusSection}>
                {/* A heading for the section, not the switch's label: the switch is named
                    "Published" so screen readers announce what "on" means. */}
                <p className={styles.statusHeader}>Status</p>
                <p className={styles.message}>
                  <i>
                    *Set a post to published for it to be live on your website,
                    or draft to save it and publish it at a later date.
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
          </PostToolbar>
        </div>
      </PostStepDialog>
    );
  }

  // One of the post's own fields, from its toolbar row: Add while it is empty, Edit once it has a
  // value.
  function renderFieldDialog() {
    const { field, value } = editing;
    const ownErrors = validatePost({ ...values, [field]: value });
    const verb = isBlank(values[field]) ? "Add" : "Edit";
    return (
      <PostStepDialog
        title={`${verb} ${POST_FIELDS[field].name}`}
        primaryLabel="Save"
        primaryDisabled={Boolean(ownErrors[field])}
        onPrimary={saveField}
        onCancel={cancelEditing}
      >
        <PostField
          field={field}
          value={value}
          onChange={(next) => setEditing({ field, value: next })}
          onBlur={() => touch(field)}
          message={messageFor(field, ownErrors)}
        />
      </PostStepDialog>
    );
  }

  // A paragraph or an image: the first paragraph's step, or Add / Edit from the review view.
  function renderElementDialog() {
    const { element } = editing;
    const index = body.findIndex((item) => item.key === element.key);
    const isNew = index === -1;
    // A new element is named as the last of the body it will join.
    const name = isNew
      ? elementNames([...body, element])[body.length]
      : elementNames(body)[index];

    if (element.type === "image") {
      return (
        <PostStepDialog
          title={isNew ? "Add an image" : "Edit image"}
          primaryLabel="Insert"
          primaryDisabled={Object.keys(validateImage(element)).length > 0}
          onPrimary={insertElement}
          onCancel={cancelEditing}
        >
          <ImageField
            value={element}
            onPatch={patchElement}
            serverErrors={
              isNew ? {} : serverErrorsFor(fieldErrors, `body.${index}.image.`)
            }
          />
        </PostStepDialog>
      );
    }

    // The first paragraph is a step of Create: cancelling it cancels the post.
    const isFirst = step === "firstParagraph";
    let title = isNew ? "Add a paragraph" : "Edit paragraph";
    if (isFirst) title = "Write your first paragraph";
    return (
      <PostStepDialog
        title={title}
        note={isFirst ? "One paragraph is required for a post." : undefined}
        primaryLabel="Insert"
        primaryDisabled={Object.keys(validateParagraph(element)).length > 0}
        onPrimary={insertElement}
        onCancel={isFirst ? requestCancel : cancelEditing}
      >
        <ParagraphField
          name={name}
          value={element}
          onChange={patchElement}
          serverError={isNew ? undefined : fieldErrors[`body.${index}.text`]}
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
      {editing?.element && renderElementDialog()}
      {confirmingCancel && (
        <ConfirmDialog
          message={
            isCreate
              ? "Are you sure you want to cancel this post?"
              : "Are you sure you want to cancel your changes?"
          }
          confirmLabel={isCreate ? "Yes, cancel post" : "Discard changes"}
          cancelLabel="Keep editing"
          onConfirm={onClose}
          onClose={() => setConfirmingCancel(false)}
        />
      )}
    </>
  );
}
