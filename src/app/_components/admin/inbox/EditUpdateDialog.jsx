// EditUpdateDialog (admin): edits a sent update's title and body. Opens when mounted; the parent
// unmounts it in onClose, which also runs once the edit is saved.

"use client";

import { useModalDialog } from "../../../_hooks/useModalDialog";
import DialogCloseButton from "../../dialogs/DialogCloseButton";
import UpdateForm from "./UpdateForm";

import styles from "../../../_styling/inbox.module.css";

export default function EditUpdateDialog({ update, editUpdate, onClose }) {
  const dialogRef = useModalDialog();

  return (
    // The close event fires for both the X and Esc.
    <dialog ref={dialogRef} onClose={onClose}>
      <DialogCloseButton dialogRef={dialogRef} />
      <h2 className={styles.heading}>Edit update</h2>
      <p className={styles.note}>
        Site owners who already read it will see the new text.
      </p>
      <UpdateForm
        initial={update}
        submitLabel="Save"
        onSubmit={(payload) => editUpdate(update.id, payload)}
        onSuccess={onClose}
      />
    </dialog>
  );
}
