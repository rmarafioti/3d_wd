// CredentialRevealModal: one-time reveal of API key and webhook secret. Blocks Esc, closes only
// via its Close button, and never persists the values beyond the modal.
//
// The parent mounts it with the raw API response and unmounts it in onClose; nothing here is
// copied into Context, a hook or storage, so the values are gone once it closes. Kept generic
// (website + credentials only) so key rotation can reuse it later.

"use client";

import { useState } from "react";
import { useModalDialog } from "../_hooks/useModalDialog";

import styles from "../_styling/credentialRevealModal.module.css";

export default function CredentialRevealModal({
  website,
  credentials,
  onClose,
}) {
  const dialogRef = useModalDialog();
  // Confirms on the button that the copy worked.
  const [copied, setCopied] = useState(false);

  function handleClose() {
    dialogRef.current.close();
    onClose();
  }

  const rows = [
    ["Website Name", website.websiteName],
    ["Website Url", website.url],
    ["API KEY", credentials.apiKey],
    ["Webhook Secret", credentials.webhookSecret],
  ];

  // Copies every value in one go, one "Label: value" per line, ready to paste into a doc.
  async function copyAll() {
    const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    // closedby="none" stops Chrome closing on a repeated Esc, which it allows even when
    // the cancel event is prevented. A modal <dialog> never closes on an outside click.
    <dialog
      ref={dialogRef}
      closedby="none"
      onCancel={(event) => event.preventDefault()}
    >
      <p className={styles.message}>
        Copy these now! They will never be shown again.
      </p>

      <dl className={styles.creds}>
        {rows.map(([label, value]) => (
          <div className={styles.credValues} key={label}>
            <dt>{label}</dt>
            <dd>
              <code>{value}</code>
            </dd>
          </div>
        ))}
      </dl>
      <div className={styles.buttonContainer}>
        <button type="button" onClick={copyAll}>
          {copied ? "Copied" : "Copy all"}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className={styles.closeButton}
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
