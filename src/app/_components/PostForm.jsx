// PostForm (site owner): the Create a Post and Edit a Post form, in a native <dialog>. One
// component for both so the fields, validation and payload building live in one place.
//
// mode "create": Website dropdown (pre-selected when there is exactly one) and an Active toggle,
// → POST /api/siteOwner/posts. mode "edit": the website name as read-only text, no Active
// toggle, → PATCH /api/siteOwner/posts/:id with the full form.
//
// Opens when mounted; the parent unmounts it in onClose (Close button or Esc) or after
// onSuccess. Frontend messages render next to their field once it has been left; backend
// error.fields render next to their field and error.message below Submit. Nothing typed is
// cleared on failure.

"use client";

import { useState } from "react";
import { useModalDialog } from "../_hooks/useModalDialog";
import ImageLinkFields from "./ImageLinkFields";
import {
  isBlank,
  validateImage,
  validateLink,
  validatePost,
} from "../_lib/validation";

const EMPTY_POST = {
  postName: "",
  postDate: "",
  header: "",
  subHeader: "",
  body: "",
  images: [],
  links: [],
};

// Form values for a Post loaded by usePost: nulls become "" and numbers become strings, so
// every input is controlled. Existing images/links keep their id (and use it as their key).
export function postToFormValues(post) {
  return {
    postName: post.postName,
    postDate: post.postDate ?? "",
    header: post.header ?? "",
    subHeader: post.subHeader ?? "",
    body: post.body,
    images: post.images.map((image) => ({
      key: image.id,
      id: image.id,
      src: image.src,
      width: String(image.width),
      height: String(image.height),
      altText: image.altText,
    })),
    links: post.links.map((link) => ({
      key: link.id,
      id: link.id,
      name: link.name,
      url: link.url,
    })),
  };
}

// Optional text: trimmed, or null when blank.
function optional(value) {
  return isBlank(value) ? null : value.trim();
}

// Builds the request body. Width/height become JSON numbers (the backend rejects strings),
// the client-only key is dropped, and id is only sent for items that already exist.
function toPayload(values) {
  return {
    postName: values.postName.trim(),
    body: values.body.trim(),
    header: optional(values.header),
    subHeader: optional(values.subHeader),
    postDate: optional(values.postDate),
    images: values.images.map(({ id, src, width, height, altText }) => ({
      ...(id ? { id } : {}),
      src: src.trim(),
      width: Number(width),
      height: Number(height),
      altText: altText.trim(),
    })),
    links: values.links.map(({ id, name, url }) => ({
      ...(id ? { id } : {}),
      name: name.trim(),
      url: url.trim(),
    })),
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
  const [images, setImages] = useState(initialValues.images);
  const [links, setLinks] = useState(initialValues.links);
  const [active, setActive] = useState(true);

  // Fields the site owner has left at least once; only their messages are shown.
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const errors = validatePost(
    { websiteId, postName, postDate, header, subHeader, body },
    { requireWebsite: isCreate },
  );
  const isValid =
    Object.keys(errors).length === 0 &&
    images.every((image) => Object.keys(validateImage(image)).length === 0) &&
    links.every((link) => Object.keys(validateLink(link)).length === 0);
  const fieldErrors = serverError?.fields ?? {};

  function touch(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function messageFor(field) {
    if (touched[field] && errors[field]) return errors[field];
    return fieldErrors[field];
  }

  // Adding or deleting an image/link shifts the indices the server's "images.N.field" messages
  // point at, so those messages are dropped rather than shown on the wrong item.
  function clearItemErrors() {
    setServerError((current) => {
      if (!current?.fields) return current;
      const fields = Object.fromEntries(
        Object.entries(current.fields).filter(
          ([path]) => !/^(images|links)\.\d+\./.test(path),
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
      images,
      links,
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
    // The close event fires for both the Close button and Esc.
    <dialog ref={dialogRef} onClose={onClose}>
      <h2>{isCreate ? "Create a Post" : "Edit Post"}</h2>

      <form onSubmit={handleSubmit} noValidate>
        {isCreate ? (
          <>
            <label htmlFor="post-website">Website</label>
            <select
              id="post-website"
              value={websiteId}
              onChange={(e) => setWebsiteId(e.target.value)}
              onBlur={() => touch("websiteId")}
            >
              <option value="">Choose a website</option>
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.websiteName}
                </option>
              ))}
            </select>
            {messageFor("websiteId") && <p>{messageFor("websiteId")}</p>}
          </>
        ) : (
          <p>Website: {websiteName}</p>
        )}

        <label htmlFor="post-name">Post Name</label>
        <p>
          Only you see this — it&apos;s how you find the post on your dashboard.
        </p>
        <input
          id="post-name"
          type="text"
          maxLength={100}
          value={postName}
          onChange={(e) => setPostName(e.target.value)}
          onBlur={() => touch("postName")}
        />
        {messageFor("postName") && <p>{messageFor("postName")}</p>}

        <label htmlFor="post-date">Post Date</label>
        <p>Shown on your website so visitors know how recent the post is.</p>
        <input
          id="post-date"
          type="date"
          value={postDate}
          onChange={(e) => setPostDate(e.target.value)}
          onBlur={() => touch("postDate")}
        />
        {messageFor("postDate") && <p>{messageFor("postDate")}</p>}

        <label htmlFor="post-header">Header</label>
        <input
          id="post-header"
          type="text"
          maxLength={150}
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          onBlur={() => touch("header")}
        />
        {messageFor("header") && <p>{messageFor("header")}</p>}

        <label htmlFor="post-sub-header">Sub Header</label>
        <input
          id="post-sub-header"
          type="text"
          maxLength={200}
          value={subHeader}
          onChange={(e) => setSubHeader(e.target.value)}
          onBlur={() => touch("subHeader")}
        />
        {messageFor("subHeader") && <p>{messageFor("subHeader")}</p>}

        <label htmlFor="post-body">Body</label>
        <textarea
          id="post-body"
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => touch("body")}
        />
        {messageFor("body") && <p>{messageFor("body")}</p>}

        <ImageLinkFields
          images={images}
          links={links}
          setImages={setImages}
          setLinks={setLinks}
          fieldErrors={fieldErrors}
          onReindex={clearItemErrors}
        />

        {isCreate && (
          <>
            <input
              id="post-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <label htmlFor="post-active">Active</label>
          </>
        )}

        <button type="submit" disabled={!isValid || submitting}>
          Submit
        </button>
        {serverError && <p>{serverError.message}</p>}
      </form>

      <button type="button" onClick={() => dialogRef.current.close()}>
        Close
      </button>
    </dialog>
  );
}
