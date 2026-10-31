// GalleryTable (site owner): one website's galleries on /dashboard, in a table like PostTable's
// (published and draft, newest first as the API returns them): Gallery Name (linking to
// /dashboard/gallery/{id}), Gallery Code (its slug: how the website asks for the gallery, so the
// site owner can say which gallery goes where; "slug" is our word, never shown), Status, and each
// row's GalleryActionsMenu. onStatusChange(gallery, status) and onDelete(gallery) are passed to
// each menu; the dashboard owns the requests and the delete's confirmation. No Created column, so the table keeps the post table's width on a
// phone. WebsiteList renders it under the website's "Galleries" heading.

import Link from "next/link";

import StatusPill from "./StatusPill";
import GalleryActionsMenu from "./GalleryActionsMenu";

import styles from "../_styling/postTable.module.css";

export default function GalleryTable({ galleries, onStatusChange, onDelete }) {
  if (galleries.length === 0) return <p>No galleries yet.</p>;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Gallery Name</th>
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
              <StatusPill
                active={gallery.status === "published"}
                onLabel="published"
                offLabel="draft"
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
