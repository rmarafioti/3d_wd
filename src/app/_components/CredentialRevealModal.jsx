// CredentialRevealModal: one-time reveal of API key and webhook secret. Blocks Esc, closes only
// via its Close button, and never persists the values beyond the modal.
//
// The parent mounts it with the raw API response and unmounts it in onClose; nothing here is
// copied into Context, a hook or storage, so the values are gone once it closes. Kept generic
// (website + credentials only) so key rotation can reuse it later.

"use client";

import { useEffect, useRef, useState } from "react";

export default function CredentialRevealModal({
  website,
  credentials,
  onClose,
}) {
  const dialogRef = useRef(null);
  // Confirms on the button that the copy worked.
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

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
      <p>Copy these now — they will never be shown again.</p>

      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <code>{value}</code>
            </dd>
          </div>
        ))}
      </dl>

      <button type="button" onClick={copyAll}>
        {copied ? "Copied" : "Copy all"}
      </button>

      <button type="button" onClick={handleClose}>
        Close
      </button>
    </dialog>
  );
}
