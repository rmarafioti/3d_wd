// ToolbarRow: one row of a review view's toolbar (PostToolbar, GalleryToolbar): what the row is,
// its ⋮ menu and, under it, the backend's message for that part, if any.

"use client";

import ActionsMenu from "../../controls/ActionsMenu";

import styles from "../../../_styling/postToolbar.module.css";

// label, for one of the post's or gallery's own fields, names the field before its value
// ("Header: A walk").
export default function ToolbarRow({
  label,
  menuLabel,
  items,
  error,
  children,
}) {
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowLabel}>
          {label && <b>{label}: </b>}
          {children}
        </span>
        <ActionsMenu
          label={menuLabel}
          items={items}
          className={styles.menuCell}
          listClassName={styles.menuList}
        />
      </div>
      {error && <p className="fieldError">{error}</p>}
    </li>
  );
}
