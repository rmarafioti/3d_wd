// LinkWebsiteDialog (admin): "Link a website to [Account Name]", a native <dialog> holding the
// WebsitePicker → POST /api/admin/accounts/:id/websites. Frontend validation messages and backend
// errors render below Submit; backend field messages render next to their field. Nothing picked
// or typed is cleared on failure.
//
// Opens when mounted; the parent unmounts it in onClose (Close button or Esc) or after
// onSuccess. The API response is handed straight to onSuccess and never kept here, because it
// may contain the one-time credentials.

"use client";

import { useEffect, useRef, useState } from "react";
import WebsitePicker, {
  EMPTY_WEBSITE,
  toWebsitePayload,
} from "./WebsitePicker";
import { validateWebsite } from "../_lib/validation";

export default function LinkWebsiteDialog({
  account,
  websites,
  linkWebsite,
  onSuccess,
  onClose,
}) {
  const dialogRef = useRef(null);
  const [website, setWebsite] = useState(EMPTY_WEBSITE);
  // Fields the admin has left at least once; only their messages are shown.
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  const errors = validateWebsite(website);
  const isValid = Object.keys(errors).length === 0;
  const fieldErrors = serverError?.fields ?? {};

  function touch(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // Validate again on click, in case anything changed since the last render.
    if (!isValid || submitting) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const response = await linkWebsite(account.id, toWebsitePayload(website));
      onSuccess(response);
    } catch (err) {
      // Everything picked or typed stays in the form.
      setServerError({ message: err.message, fields: err.fields });
      setSubmitting(false);
    }
  }

  return (
    // The close event fires for both the Close button and Esc.
    <dialog ref={dialogRef} onClose={onClose}>
      <h2>Link a website to {account.name}</h2>

      <form onSubmit={handleSubmit} noValidate>
        <WebsitePicker
          websites={websites}
          value={website}
          onChange={setWebsite}
          onBlur={touch}
          fieldErrors={fieldErrors}
        />

        <button type="submit" disabled={!isValid || submitting}>
          Submit
        </button>

        {Object.entries(errors)
          .filter(([field]) => touched[field])
          .map(([field, message]) => (
            <p key={field}>{message}</p>
          ))}
        {serverError && <p>{serverError.message}</p>}
        {/* There is no websiteId input, so this field message goes with the general error. */}
        {fieldErrors.websiteId && <p>{fieldErrors.websiteId}</p>}
      </form>

      <button type="button" onClick={() => dialogRef.current.close()}>
        Close
      </button>
    </dialog>
  );
}
