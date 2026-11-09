// PublishDateEditor: a draft's publish date on the post and gallery pages, saved on its own with
// "Set publish date" (then back to /dashboard) or cleared with Clear, without opening Edit.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PublishDateField from "./PublishDateField";
import { publishAtToDate, toPublishAt } from "../../../_lib/publishAt";
import { validatePublishAt } from "../../../_lib/validation";

import styles from "../../../_styling/postPage.module.css";

// publishAt is the saved date (or null). onSave(publishAt) sends an instant or null and throws the
// API error on failure. The page keys this on the saved date, so a save starts it afresh.
export default function PublishDateEditor({ publishAt, onSave, note }) {
  const router = useRouter();
  const [publishDate, setPublishDate] = useState(publishAtToDate(publishAt));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  // The backend's message for a refused save: its fields.publishAt, or its message.
  const [serverMessage, setServerMessage] = useState(null);

  const ownError = validatePublishAt(publishDate, {
    storedPublishAt: publishAt,
  });
  const picked = toPublishAt(publishDate);
  const isSaved =
    picked !== null &&
    publishAt !== null &&
    new Date(picked).getTime() === new Date(publishAt).getTime();
  const message = serverMessage ?? (touched ? ownError : null);

  function changeDate(next) {
    setPublishDate(next);
    setServerMessage(null);
  }

  async function save(next) {
    setSaving(true);
    setServerMessage(null);
    try {
      await onSave(next);
      // A set date goes back to /dashboard, whose list refetches on arrival, so the row's Live on
      // shows it. A cleared one stays: the emptied field shows it.
      if (next) router.push("/dashboard");
    } catch (err) {
      setServerMessage(err.fields?.publishAt ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  // A saved date is cleared on the backend; a date only typed here is just emptied.
  function handleClear() {
    if (publishAt) save(null);
    else changeDate("");
  }

  return (
    <div className={styles.publishDateEditor}>
      <PublishDateField
        publishDate={publishDate}
        onChange={changeDate}
        onBlur={() => setTouched(true)}
        message={message}
        note={note}
        canClear={publishDate !== "" || publishAt !== null}
        onClear={handleClear}
        onSet={() => save(picked)}
        setDisabled={picked === null || Boolean(ownError) || isSaved}
        busy={saving}
      />
    </div>
  );
}
