// LinkWebsiteDialog (admin): "Link a website to [Account Name]", a native <dialog> holding the
// WebsitePicker → POST /api/admin/accounts/:id/websites. Frontend validation messages and backend
// errors render below Submit; backend field messages render next to their field. Nothing picked
// or typed is cleared on failure.
//
// Opens when mounted; the parent unmounts it in onClose (Close button or Esc) or after
// onSuccess. The API response is handed straight to onSuccess and never kept here, because it
// may contain the one-time credentials.

"use client";

import { useState } from "react";
import { useModalDialog } from "../_hooks/useModalDialog";
import WebsitePicker, {
  EMPTY_WEBSITE,
  toWebsitePayload,
} from "./WebsitePicker";
import SubmitErrors from "./SubmitErrors";
import { validateWebsite } from "../_lib/validation";

export default function LinkWebsiteDialog({
  account,
  websites,
  linkWebsite,
  onSuccess,
  onClose,
}) {
  const dialogRef = useModalDialog();
  const [website, setWebsite] = useState(EMPTY_WEBSITE);
  // Fields the admin has left at least once; only their messages are shown.
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const errors = validateWebsite(website);
  const isValid = Object.keys(errors).length === 0;
  const fieldErrors = serverError?.fields ?? {};

  function touch(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // The button is disabled while invalid or submitting; this also catches a second submit
    // that lands before the re-render.
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

        <SubmitErrors
          errors={errors}
          touched={touched}
          serverError={serverError}
        />
      </form>

      <button type="button" onClick={() => dialogRef.current.close()}>
        Close
      </button>
    </dialog>
  );
}
