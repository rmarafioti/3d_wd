// useModalDialog: for a native <dialog> that opens as soon as its component mounts. Returns
// the ref to put on the <dialog>; on mount it opens it with showModal(). The parent unmounts
// the component to get rid of it. A modal <dialog> never closes on an outside click; Esc
// closes it unless the component handles the cancel event (CredentialRevealModal does).

"use client";

import { useEffect, useRef } from "react";

export function useModalDialog() {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    // Strict Mode runs this effect twice; showModal() throws on a dialog that is already open.
    if (!dialog.open) dialog.showModal();
  }, []);

  return dialogRef;
}
