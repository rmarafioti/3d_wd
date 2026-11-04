// GalleryTable (site owner): one website's galleries on /dashboard, each with its code, status pill
// and ⋮ menu.

import Link from "next/link";

import Pill from "./Pill";
import GalleryActionsMenu from "./GalleryActionsMenu";

import styles from "../_styling/postTable.module.css";

export default function GalleryTable({ galleries, onStatusChange, onDelete }) {
  if (galleries.length === 0) return <p>No galleries yet.</p>;

  return (
    <table className={styles.table}>
      {/* No Created column, so the table keeps the post table's width on a phone. */}
      <thead>
        <tr>
          <th scope="col">Gallery Name</th>
          {/* The slug, so the site owner can say which gallery goes where; the word is never shown. */}
          <th scope="col" className={styles.slugColumn}>
            Gallery Code
          </th>
          <th scope="col" className={styles.statusColumn}>
            Status
          </th>
          {/* Named for screen readers; the ⋮ buttons need no visible heading. */}
          <th scope="col" className={styles.actionsColumn}>
            <span className={styles.visuallyHidden}>Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {galleries.map((gallery) => (
          <tr key={gallery.id}>
            <td className={styles.wrapCell}>
              <Link href={`/dashboard/gallery/${gallery.id}`}>
                {gallery.galleryName}
              </Link>
            </td>
            <td className={styles.wrapCell}>{gallery.slug}</td>
            <td>
              <Pill
                label={gallery.status}
                tone={gallery.status === "published" ? "green" : "red"}
              />
            </td>
            {/* Positioned, so the menu's list opens from this cell's edges. */}
            <td className={styles.actionsCell}>
              <GalleryActionsMenu
                gallery={gallery}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
