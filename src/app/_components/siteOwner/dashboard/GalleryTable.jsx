// GalleryTable (site owner): one website's galleries on /dashboard, each with its code, status pill,
// placement pill and ⋮ menu.

import Link from "next/link";

import Pill from "../../controls/Pill";
import GalleryActionsMenu from "./GalleryActionsMenu";
import { placementTone } from "../../../_lib/abilities";
import { liveOnDate } from "../../../_lib/publishAt";

import styles from "../../../_styling/postTable.module.css";

export default function GalleryTable({ galleries, onStatusChange, onDelete }) {
  if (galleries.length === 0) return <p>No galleries yet.</p>;

  return (
    <table className={`${styles.table} ${styles.stackedTable}`}>
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
          <th scope="col" className={styles.liveOnColumn}>
            Live on
          </th>
          <th scope="col" className={styles.placementColumn}>
            Placement
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
            <td data-label="Gallery Name" className={styles.wrapCell}>
              <Link href={`/dashboard/gallery/${gallery.id}`}>
                {gallery.galleryName}
              </Link>
            </td>
            <td data-label="Gallery Code" className={styles.wrapCell}>
              {gallery.slug}
            </td>
            <td data-label="Status">
              <Pill
                label={gallery.status}
                tone={gallery.status === "published" ? "green" : "red"}
              />
            </td>
            <td data-label="Live on">{liveOnDate(gallery)}</td>
            {/* Once its request form was sent, as on the gallery page: requested until the admin
                sets it live. Empty before then. */}
            <td data-label="Placement">
              {gallery.requestedAt && gallery.placement && (
                <Pill
                  label={gallery.placement}
                  tone={placementTone(gallery.placement)}
                />
              )}
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
