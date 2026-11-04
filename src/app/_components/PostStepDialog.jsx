// PostStepDialog (site owner): the dialog every step and part of the post and gallery forms opens
// in: a fixed title over scrolling content, then a Cancel / primary row or an X. Opens when mounted.

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

  // Cancel, the X and Esc all call onCancel and never close the dialog themselves, since the parent
  // may ask "Are you sure…?" first and keep it open. Esc's cancel event is stopped for that.
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
        {/* Only the review view, which has no Cancel, has an X: beside Cancel it would look like
            a second, different way out. */}
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
