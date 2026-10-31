// ActionsMenu: the shared ⋮ menu, used by each post's and gallery's row on /dashboard
// (PostActionsMenu, GalleryActionsMenu) and by each row of the toolbar in Create / Edit Post and
// Create / Edit a Gallery (ToolbarRow). A disclosure, like the Accounts aside, not an ARIA menu:
// plain links and buttons, reached with Tab. Closed by default; it closes on Esc (focus back on
// ⋮), on a click outside it, and once an item is picked, unless the item is marked keepOpen (the
// toolbars' move arrows, so an element or image can be moved several places). Its list opens from
// the nearest positioned ancestor.
//
// label names the ⋮ button for screen readers ("Actions for First Post!"). className and
// listClassName add a class to the menu itself (the ⋮ and its list) and to the open list, for a
// caller that lays them out differently. Each item is
// { label, href } for a link or { label, onClick } for a button; an item with an Icon shows only
// the icon, named by its label for screen readers and showing its title on hover.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BsThreeDotsVertical } from "react-icons/bs";

import styles from "../_styling/actionsMenu.module.css";

export default function ActionsMenu({
  label,
  items,
  className = "",
  listClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Listens only while open. A click on another row's ⋮ is outside this menu, so only one stays
  // open.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event) {
      if (!menuRef.current.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      // Inside a dialog, Esc closes only this menu, not the dialog too.
      event.preventDefault();
      setOpen(false);
      buttonRef.current.focus();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleItemClick(item) {
    if (!item.keepOpen) setOpen(false);
    item.onClick?.();
  }

  return (
    <div ref={menuRef} className={className}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.menuButton}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <BsThreeDotsVertical aria-hidden="true" />
      </button>
      {open && (
        <ul className={`${styles.menuList} ${listClassName}`}>
          {items.map((item) => {
            const { Icon } = item;
            const content = Icon ? <Icon aria-hidden="true" /> : item.label;
            return (
              <li key={item.label}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={styles.menuItem}
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={styles.menuItem}
                    aria-label={Icon ? item.label : undefined}
                    title={item.title}
                    onClick={() => handleItemClick(item)}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
