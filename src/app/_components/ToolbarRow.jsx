// ToolbarRow: one row of the review view's toolbar in Create / Edit Post (PostToolbar) and Create /
// Edit a Gallery (GalleryToolbar): what the row is (children), its ⋮ menu (the shared ActionsMenu,
// named by menuLabel, with items) and, under it, the backend's message for that part, if any.
// label, for one of the post's or gallery's own fields, names the field before its value
// ("Header: A walk"), so the row says which field it is; the row stays one line, cut off with an
// ellipsis, so a label never widens the toolbar.

"use client";

import ActionsMenu from "./ActionsMenu";

import styles from "../_styling/postToolbar.module.css";

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
