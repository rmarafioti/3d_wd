// ActionsMenu: the shared ⋮ menu of the dashboard's tables and the review toolbars, a disclosure
// of links and buttons (not an ARIA menu), its list opening from the nearest positioned ancestor.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BsThreeDotsVertical } from "react-icons/bs";
import { GoTriangleDown, GoTriangleRight } from "react-icons/go";

import styles from "../_styling/actionsMenu.module.css";

// label names the ⋮ button for screen readers ("Actions for First Post!"). className and
// listClassName add a class to the menu itself (the ⋮ and its list) and to the open list, for a
// caller that lays them out differently. Each item is { label, href } for a link or
// { label, onClick } for a button; an item with an Icon shows only the icon, named by its label.
// keepOpen keeps the menu open after a click, so a move arrow can move an element several places.
// phoneLabel, for a table that turns on its side at phone width, shows that word with the asides'
// triangle in place of the ⋮ there ("Actions ▸").
export default function ActionsMenu({
  label,
  items,
  className = "",
  listClassName = "",
  phoneLabel,
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

  const Triangle = open ? GoTriangleDown : GoTriangleRight;

  return (
    <div
      ref={menuRef}
      className={`${className} ${phoneLabel ? styles.hasPhoneTrigger : ""}`}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.menuButton}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <BsThreeDotsVertical aria-hidden="true" className={styles.dotsIcon} />
        {phoneLabel && (
          <span aria-hidden="true" className={styles.phoneTrigger}>
            {phoneLabel}
            <Triangle />
          </span>
        )}
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
