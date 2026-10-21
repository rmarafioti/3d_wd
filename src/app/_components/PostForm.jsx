// PostForm (site owner): the Create a Post and Edit a Post form, in a native <dialog>. One
// component for both so the fields, validation and payload building live in one place.
//
// mode "create": Website dropdown (pre-selected when there is exactly one) and an Active toggle,
// → POST /api/siteOwner/posts. mode "edit": the website name as read-only text (its websiteId is
// passed in for image uploads), no Active toggle, → PATCH /api/siteOwner/posts/:id with the full
// form.
//
// Publish first uploads any newly picked images (uploadImages: one signature, then each file to
// Cloudinary) and swaps their Cloudinary src, width and height into the body, then saves. If an
// upload fails nothing is saved; images already uploaded keep their Cloudinary src, so trying
// again doesn't upload them twice. While it works, Publish reads "Uploading images…" and then
// "Publishing…". useFormTimeout clears the form after 20 hours.
//
// Opens when mounted; the parent unmounts it in onClose (the X or Esc) or after
// onSuccess. The body, with its formatting, is edited by PostBodyFields. Frontend messages
// render next to their field once it has been left; backend error.fields render next to their
// field and error.message below Publish. Nothing typed is cleared on failure.
//
// PostPreview shows the post live as it is typed (docs/flows.md → Post preview). On desktop it
// sits beside the form, open to start with, and its toggle hides or reveals it. On a phone it is
// a view of its own: Preview switches to it and Back to edit returns to the form, which stays
// mounted (hidden) meanwhile so nothing typed is lost; that view has its own Publish, which
// submits the same form.

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GoTriangleDown, GoTriangleRight } from "react-icons/go";
import { useModalDialog } from "../_hooks/useModalDialog";
import { useIsPhone } from "../_hooks/useIsPhone";
import { useFormTimeout } from "../_hooks/useFormTimeout";
import PostBodyFields, {
  EMPTY_PARAGRAPH,
  isIncompleteElement,
} from "./PostBodyFields";
import PostPreview from "./PostPreview";
import { releaseObjectUrl } from "./ImageField";
import Toggle from "./Toggle";
import DialogCloseButton from "./DialogCloseButton";
import { isBlank, validateBody, validatePost } from "../_lib/validation";
import { uploadImages } from "../_lib/uploadImages";

import styles from "../_styling/postForm.module.css";
import previewStyles from "../_styling/postPreview.module.css";

// A new post starts with one empty paragraph, since every body needs at least one.
const EMPTY_POST = {
  postName: "",
  postDate: "",
  header: "",
  subHeader: "",
  body: [{ ...EMPTY_PARAGRAPH, key: "first-paragraph" }],
};

const TIMED_OUT_MESSAGE =
  "This form was open for 20 hours, so it timed out. Nothing was saved. Please open it again.";

// Form values for a Post loaded by usePost: nulls become "", so every input is controlled. Body
// elements are flattened for PostBodyFields; paragraphs have no id, so they get a fresh key.
// Existing images keep their id (and use it as their key), src and size.
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

export default function PostForm({
  mode,
  websites = [],
  websiteId: postWebsiteId,
  websiteName,
  initialValues = EMPTY_POST,
  onSubmit,
  onSuccess,
  onClose,
}) {
  const isCreate = mode === "create";
  const dialogRef = useModalDialog();

  // Edit is given the post's website; Create picks one, pre-selected when there is only one.
  const [websiteId, setWebsiteId] = useState(
    postWebsiteId ?? (websites.length === 1 ? websites[0].id : ""),
  );
  const [postName, setPostName] = useState(initialValues.postName);
  const [postDate, setPostDate] = useState(initialValues.postDate);
  const [header, setHeader] = useState(initialValues.header);
  const [subHeader, setSubHeader] = useState(initialValues.subHeader);
  const [body, setBody] = useState(initialValues.body);
  const [active, setActive] = useState(true);

  // Fields the site owner has left at least once; only their messages are shown.
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [timedOut, setTimedOut] = useState(false);

  // Picked files are shown from object URLs, let go of when the form closes. The ref follows the
  // body so the cleanup on unmount sees it as it is then.
  const bodyRef = useRef(body);
  useEffect(() => {
    bodyRef.current = body;
  });
  useEffect(() => () => bodyRef.current.forEach(releaseImage), []);

  // The picked files leave memory with the body, and the dialog shows only the timed-out message.
  useFormTimeout(() => {
    body.forEach(releaseImage);
    setBody([]);
    setTimedOut(true);
  });

  // The preview: open or hidden beside the form on desktop, a separate view on a phone.
  const formId = useId();
  const previewId = useId();
  const isPhone = useIsPhone();
  const [previewOpen, setPreviewOpen] = useState(true);
  const [phoneView, setPhoneView] = useState("form");
  const showPreview = isPhone ? phoneView === "preview" : previewOpen;

  const errors = validatePost(
    { websiteId, postName, postDate, header, subHeader },
    { requireWebsite: isCreate },
  );
  const isValid =
    Object.keys(errors).length === 0 &&
    Object.keys(validateBody(body)).length === 0 &&
    !body.some(isIncompleteElement);
  const fieldErrors = serverError?.fields ?? {};
  // Publish names the step it is on; the line under it is only for a failure's message.
  let progress = null;
  if (uploading) progress = "Uploading images…";
  else if (submitting) progress = "Publishing…";
  const errorMessage = serverError?.message;

  function touch(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function messageFor(field) {
    if (touched[field] && errors[field]) return errors[field];
    return fieldErrors[field];
  }

  // Adding, moving or deleting a body element shifts the indices the server's "body.N.…"
  // messages point at, so those messages are dropped rather than shown on the wrong element.
  // The list's own message ("body") is dropped too: it was about the list as it was, which has
  // now changed.
  function clearItemErrors() {
    setServerError((current) => {
      if (!current?.fields) return current;
      const fields = Object.fromEntries(
        Object.entries(current.fields).filter(
          ([path]) => !/^body(\.\d+\.|$)/.test(path),
        ),
      );
      return { ...current, fields };
    });
  }

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
    setBody((list) => list.map(swap));
    return body.map(swap);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // The button is disabled while invalid or submitting; this also catches a second submit
    // that lands before the re-render.
    if (!isValid || submitting) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const payload = toPayload({
        postName,
        postDate,
        header,
        subHeader,
        body: await uploadNewImages(),
      });
      const post = await onSubmit(
        isCreate ? { websiteId, ...payload, active } : payload,
      );
      onSuccess(post);
    } catch (err) {
      // Everything typed stays in the form. A failed upload throws its own message, a failed sign
      // or save the backend's.
      setServerError({ message: err.message, fields: err.fields });
      setSubmitting(false);
    }
  }

  return (
    // The close event fires for both the X and Esc.
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={`${previewStyles.postDialog} ${showPreview && !isPhone ? previewStyles.withPreview : ""}`}
    >
      {/* The title and the X stay put above the form and preview, which scroll beneath them, so
          the X is always in reach and never covers the preview toggle. */}
      <div className={previewStyles.dialogHeader}>
        <h2>{isCreate ? "Create a Post" : "Edit Post"}</h2>
        <DialogCloseButton dialogRef={dialogRef} />
      </div>

      {timedOut ? (
        <p>{TIMED_OUT_MESSAGE}</p>
      ) : (
        <div className={previewStyles.layout}>
          <div
            className={previewStyles.formColumn}
            hidden={isPhone && phoneView === "preview"}
          >
            <form id={formId} onSubmit={handleSubmit} noValidate>
              {isCreate ? (
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
              ) : (
                <p className={styles.websiteSection}>Website: {websiteName}</p>
              )}

              <label htmlFor="post-name">Post Name</label>
              <p className={styles.message}>
                <i>
                  *Only you see this, it&apos;s how you find the post on your
                  dashboard.
                </i>
              </p>

              <input
                id="post-name"
                type="text"
                maxLength={100}
                value={postName}
                onChange={(e) => setPostName(e.target.value)}
                onBlur={() => touch("postName")}
              />
              {messageFor("postName") && (
                <p className="fieldError">{messageFor("postName")}</p>
              )}

              <label htmlFor="post-date">Post Date</label>
              <p className={styles.message}>
                <i>
                  *Shown on your website so visitors know how recent the post
                  is.
                </i>
              </p>
              <input
                id="post-date"
                type="date"
                value={postDate}
                onChange={(e) => setPostDate(e.target.value)}
                onBlur={() => touch("postDate")}
              />
              {messageFor("postDate") && (
                <p className="fieldError">{messageFor("postDate")}</p>
              )}

              <label htmlFor="post-header">Header</label>
              <input
                id="post-header"
                type="text"
                maxLength={150}
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                onBlur={() => touch("header")}
              />
              {messageFor("header") && (
                <p className="fieldError">{messageFor("header")}</p>
              )}

              <label htmlFor="post-sub-header">Sub Header</label>
              <input
                id="post-sub-header"
                type="text"
                maxLength={200}
                value={subHeader}
                onChange={(e) => setSubHeader(e.target.value)}
                onBlur={() => touch("subHeader")}
              />
              {messageFor("subHeader") && (
                <p className="fieldError">{messageFor("subHeader")}</p>
              )}

              <PostBodyFields
                body={body}
                setBody={setBody}
                fieldErrors={fieldErrors}
                onReindex={clearItemErrors}
              />

              {isCreate && (
                <>
                  {/* A heading for the section, not the switch's label: the switch is named "Active"
                so screen readers announce what "on" means. */}
                  <p className={styles.statusHeader}>Status</p>
                  <p className={`${styles.message} ${styles.statusNote}`}>
                    <i>
                      *Set a post to active for it to be live on your website,
                      or inactive to save it and make it live at a later date.
                    </i>
                  </p>
                  <Toggle
                    label="Active"
                    offLabel="inactive"
                    onLabel="active"
                    checked={active}
                    onChange={setActive}
                  />
                </>
              )}
              <div className={styles.submitSection}>
                <div className={styles.buttonRow}>
                  <button type="submit" disabled={!isValid || submitting}>
                    {progress ?? "Publish"}
                  </button>
                  {isPhone && (
                    <button
                      type="button"
                      onClick={() => setPhoneView("preview")}
                    >
                      Preview
                    </button>
                  )}
                </div>
                {/* A disabled button's new label isn't reliably announced, so screen readers
                  hear the progress from here. */}
                <p role="status" className={styles.visuallyHidden}>
                  {progress}
                </p>
                {errorMessage && <p>{errorMessage}</p>}
              </div>
            </form>
          </div>

          <div
            className={`${previewStyles.previewColumn} ${showPreview ? previewStyles.open : ""}`}
          >
            {!isPhone && (
              <button
                type="button"
                aria-expanded={previewOpen}
                aria-controls={previewId}
                onClick={() => setPreviewOpen((open) => !open)}
                className={previewStyles.toggle}
              >
                {previewOpen ? (
                  <GoTriangleDown aria-hidden="true" />
                ) : (
                  <GoTriangleRight aria-hidden="true" />
                )}
                Preview
              </button>
            )}
            {showPreview && (
              <div id={previewId}>
                <PostPreview
                  header={header}
                  subHeader={subHeader}
                  postDate={postDate}
                  body={body}
                />
                {/* On a phone the form is hidden behind the preview, so the preview has its own way
                  back and its own Publish, which submits the same form. */}
                {isPhone && (
                  <>
                    <div className={previewStyles.previewButtons}>
                      <button
                        type="button"
                        onClick={() => setPhoneView("form")}
                      >
                        Back to edit
                      </button>
                      <button
                        type="submit"
                        form={formId}
                        disabled={!isValid || submitting}
                      >
                        {progress ?? "Publish"}
                      </button>
                    </div>
                    <p role="status" className={styles.visuallyHidden}>
                      {progress}
                    </p>
                    {errorMessage && <p>{errorMessage}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
