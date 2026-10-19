// PostForm (site owner): the Create a Post and Edit a Post form, in a native <dialog>. One
// component for both so the fields, validation and payload building live in one place.
//
// mode "create": Website dropdown (pre-selected when there is exactly one) and an Active toggle,
// → POST /api/siteOwner/posts. mode "edit": the website name as read-only text, no Active
// toggle, → PATCH /api/siteOwner/posts/:id with the full form.
//
// Opens when mounted; the parent unmounts it in onClose (the X or Esc) or after
// onSuccess. The body, with its formatting, is edited by PostBodyFields. Frontend messages
// render next to their field once it has been left; backend error.fields render next to their
// field and error.message below Submit. Nothing typed is cleared on failure.

"use client";

import { useState } from "react";
import { useModalDialog } from "../_hooks/useModalDialog";
import PostBodyFields, {
  EMPTY_PARAGRAPH,
  isIncompleteElement,
} from "./PostBodyFields";
import Toggle from "./Toggle";
import DialogCloseButton from "./DialogCloseButton";
import { isBlank, validateBody, validatePost } from "../_lib/validation";

import styles from "../_styling/postForm.module.css";

// A new post starts with one empty paragraph, since every body needs at least one.
const EMPTY_POST = {
  postName: "",
  postDate: "",
  header: "",
  subHeader: "",
  body: [{ ...EMPTY_PARAGRAPH, key: "first-paragraph" }],
};

// Form values for a Post loaded by usePost: nulls become "" and numbers become strings, so
// every input is controlled. Body elements are flattened for PostBodyFields; paragraphs have
// no id, so they get a fresh key. Existing images keep their id (and use it as their key).
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
        width: String(image.width),
        height: String(image.height),
        altText: image.altText,
      };
    }),
  };
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
      src: src.trim(),
      width: Number(width),
      height: Number(height),
      altText: altText.trim(),
    },
  };
}

// Builds the request body. Width/height become JSON numbers (the backend rejects strings),
// the client-only key is dropped, and id is only sent for images that already exist.
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
  websiteName,
  initialValues = EMPTY_POST,
  onSubmit,
  onSuccess,
  onClose,
}) {
  const isCreate = mode === "create";
  const dialogRef = useModalDialog();

  const [websiteId, setWebsiteId] = useState(
    websites.length === 1 ? websites[0].id : "",
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
  const [serverError, setServerError] = useState(null);

  const errors = validatePost(
    { websiteId, postName, postDate, header, subHeader },
    { requireWebsite: isCreate },
  );
  const isValid =
    Object.keys(errors).length === 0 &&
    Object.keys(validateBody(body)).length === 0 &&
    !body.some(isIncompleteElement);
  const fieldErrors = serverError?.fields ?? {};

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

  async function handleSubmit(event) {
    event.preventDefault();
    // The button is disabled while invalid or submitting; this also catches a second submit
    // that lands before the re-render.
    if (!isValid || submitting) return;

    const payload = toPayload({
      postName,
      postDate,
      header,
      subHeader,
      body,
    });

    setSubmitting(true);
    setServerError(null);
    try {
      const post = await onSubmit(
        isCreate ? { websiteId, ...payload, active } : payload,
      );
      onSuccess(post);
    } catch (err) {
      // Everything typed stays in the form.
      setServerError({ message: err.message, fields: err.fields });
      setSubmitting(false);
    }
  }

  return (
    // The close event fires for both the X and Esc.
    <dialog ref={dialogRef} onClose={onClose}>
      <DialogCloseButton dialogRef={dialogRef} />
      <h2>{isCreate ? "Create a Post" : "Edit Post"}</h2>

      <form onSubmit={handleSubmit} noValidate>
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
          <i>*Shown on your website so visitors know how recent the post is.</i>
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
                *Set a post to active for it to be live on your website, or
                inactive to save it and make it live at a later date.
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
              Submit
            </button>
          </div>
          {serverError && <p>{serverError.message}</p>}
        </div>
      </form>
    </dialog>
  );
}
