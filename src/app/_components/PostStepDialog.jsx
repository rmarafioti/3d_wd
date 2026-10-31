// PostStepDialog (site owner): the dialog every part of Create / Edit Post opens in: the steps
// (Post Name, the optional details, the first paragraph), the review view, and each dialog the
// review view opens on top of itself to add or edit one part of the post (docs/flows.md → Create a
// Post). Create / Edit a Gallery uses it the same way, and for its crop dialogs. Opens when
// mounted; the parent unmounts it.
//
// Its title stays put while its content scrolls beneath it. With a primaryLabel ("Next",
// "Insert", "Save") it ends in a Cancel and primary button row, and has no X: an X beside Cancel
// would look like a second, different way out (Rich, 2026-10-30). The review view, the large
// dialog with the preview, has no Cancel at all: its X (withCloseButton) is its one way out. Cancel, the X
// and Esc all call onCancel and never close the dialog themselves, because the parent may ask
// "Are you sure…?" first and keep it open.

"use client";

import { useId } from "react";
import { useModalDialog } from "../_hooks/useModalDialog";
import DialogCloseButton from "./DialogCloseButton";

import styles from "../_styling/postForm.module.css";

export default function PostStepDialog({
  title,
  note,
  className,
  primaryLabel,
  primaryDisabled = false,
  onPrimary,
  onCancel,
  withCloseButton = false,
  children,
}) {
  const dialogRef = useModalDialog();
  const titleId = useId();

  // Esc fires the cancel event; it is stopped so the parent decides whether the dialog goes.
  function handleCancelEvent(event) {
    event.preventDefault();
    onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancelEvent}
      // className sets the dialog's own width (the review view); otherwise a step's width.
      className={`${styles.stepDialog} ${className ?? styles.stepWidth}`}
    >
      <div className={styles.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        {withCloseButton && (
          <DialogCloseButton dialogRef={dialogRef} onClick={onCancel} />
        )}
      </div>
      <div className={styles.dialogContent}>
        {note && (
          <p className={styles.message}>
            <i>*{note}</i>
          </p>
        )}
        {children}
        {primaryLabel && (
          // Cancel on the left, the step's own button (Next, Insert, Save) on the right.
          <div className="dialogButtons">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              disabled={primaryDisabled}
              onClick={onPrimary}
            >
              {primaryLabel}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
