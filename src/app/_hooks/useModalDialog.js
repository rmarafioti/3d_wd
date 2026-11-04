// useModalDialog: returns the ref for a native <dialog> that opens with showModal() as soon as its
// component mounts; the parent unmounts the component to close it for good.

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
