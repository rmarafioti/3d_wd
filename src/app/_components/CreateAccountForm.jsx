// CreateAccountForm (admin): Site Owner Name, Site Owner Email and the WebsitePicker →
// POST /api/admin/accounts. Frontend validation messages and backend errors render below
// Submit; backend field messages render next to their field. On success it shows the one-time
// CredentialRevealModal (new website) or a confirmation dialog (existing website), then clears.

"use client";

import { useState } from "react";
import WebsitePicker, {
  EMPTY_WEBSITE,
  toWebsitePayload,
} from "./WebsitePicker";
import CredentialRevealModal from "./CredentialRevealModal";
import MessageDialog from "./MessageDialog";
import { isBlank, isValidEmail, validateWebsite } from "../_lib/validation";

// Frontend checks, in display order. UX only — the backend re-validates everything.
function validate({ name, email, website }) {
  const errors = {};
  if (isBlank(name)) errors.name = "A site owner name is required";
  if (isBlank(email)) errors.email = "A site owner email is required";
  else if (!isValidEmail(email))
    errors.email = "A valid email address is required";
  return { ...errors, ...validateWebsite(website) };
}

export default function CreateAccountForm({
  websites,
  createAccount,
  onNewWebsite,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(EMPTY_WEBSITE);
  // Fields the admin has left at least once; only their messages are shown.
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  // The raw API response, held only while its dialog is open. It may contain the one-time
  // credentials, so it is set back to null the moment the dialog closes.
  const [result, setResult] = useState(null);

  const errors = validate({ name, email, website });
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
      const response = await createAccount({
        name: name.trim(),
        email: email.trim(),
        ...toWebsitePayload(website),
      });
      setResult(response);
    } catch (err) {
      // Everything typed stays in the form.
      setServerError(err);
    } finally {
      setSubmitting(false);
    }
  }

  function clearForm() {
    setName("");
    setEmail("");
    setWebsite(EMPTY_WEBSITE);
    setTouched({});
  }

  function handleRevealClose() {
    setResult(null);
    clearForm();
    onNewWebsite();
  }

  function handleLinkedClose() {
    setResult(null);
    clearForm();
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="create-account-name">Site Owner Name</label>
        <input
          id="create-account-name"
          type="text"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => touch("name")}
        />
        {fieldErrors.name && <p>{fieldErrors.name}</p>}

        <label htmlFor="create-account-email">Site Owner Email</label>
        <input
          id="create-account-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => touch("email")}
        />
        {fieldErrors.email && <p>{fieldErrors.email}</p>}

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

      {result?.credentials && (
        <CredentialRevealModal
          website={result.website}
          credentials={result.credentials}
          onClose={handleRevealClose}
        />
      )}
      {result && !result.credentials && (
        <MessageDialog
          message={`Account created and linked to ${result.website.websiteName}. No new API key or webhook secret were generated — the website's existing credentials are unchanged.`}
          onClose={handleLinkedClose}
        />
      )}
    </>
  );
}
