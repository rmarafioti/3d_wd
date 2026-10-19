// MessageDialog: native <dialog> for a one-line success or error message. Opens when mounted;
// closes with its X (DialogCloseButton) or Esc (native), never on an outside click. The parent
// unmounts it in onClose.

"use client";

import { useModalDialog } from "../_hooks/useModalDialog";
import DialogCloseButton from "./DialogCloseButton";

export default function MessageDialog({ message, onClose }) {
  const dialogRef = useModalDialog();

  return (
    // The close event fires for both the X and Esc.
    <dialog ref={dialogRef} onClose={onClose}>
      <DialogCloseButton dialogRef={dialogRef} />
      <p>{message}</p>
    </dialog>
  );
}
