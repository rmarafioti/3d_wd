// PostActionsMenu (site owner): the ⋮ button at the end of each post's row on /dashboard, with
// shortcuts to what the post page offers: View, Edit (the post page with its Edit form open),
// Status ("Status to publish" on a draft, "Status to draft" on a published post, worded to match
// the table's Status column: onStatusChange, which saves straight away, since it can be undone) and
// Delete (onDelete, whose confirmation the dashboard owns). A disclosure, like the Accounts aside,
// not an ARIA menu: plain links and a button, reached with Tab. Closed by default; it closes on Esc
// (focus back on ⋮), on a click outside it, and once an item is picked. Its list opens from the
// nearest positioned ancestor (PostList's actions cell).

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BsThreeDotsVertical } from "react-icons/bs";

import styles from "../_styling/postActionsMenu.module.css";

export default function PostActionsMenu({ post, onStatusChange, onDelete }) {
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

  const postPath = `/dashboard/post/${post.id}`;
  const isPublished = post.status === "published";
  const items = [
    { label: "View", href: postPath },
    { label: "Edit", href: `${postPath}?edit=1` },
    {
      label: isPublished ? "Status to draft" : "Status to publish",
      onClick: () => {
        setOpen(false);
        onStatusChange(post, isPublished ? "draft" : "published");
      },
    },
    {
      label: "Delete",
      onClick: () => {
        setOpen(false);
        onDelete(post);
      },
    },
  ];

  return (
    <div ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.menuButton}
        aria-label={`Actions for ${post.postName}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <BsThreeDotsVertical aria-hidden="true" />
      </button>
      {open && (
        <ul className={styles.menuList}>
          {items.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={styles.menuItem}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  className={styles.menuItem}
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
