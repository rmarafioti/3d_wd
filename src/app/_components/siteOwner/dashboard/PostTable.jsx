// PostTable (site owner): one website's posts on /dashboard, a row each with its ⋮ menu. The
// dashboard owns the requests behind onStatusChange and onDelete, and the delete's confirmation.

import Link from "next/link";

import Pill from "../../controls/Pill";
import PostActionsMenu from "./PostActionsMenu";

import { liveOnDate } from "../../../_lib/publishAt";

import styles from "../../../_styling/postTable.module.css";

export default function PostTable({ posts, onStatusChange, onDelete }) {
  if (posts.length === 0) return <p>No posts yet.</p>;

  return (
    <table className={`${styles.table} ${styles.stackedTable}`}>
      <thead>
        <tr>
          {/* Created, not the optional Post Date: every post has one, and Post Date is only what
          the site owner shows on their website. */}
          <th scope="col" className={styles.createdColumn}>
            Created
          </th>
          <th scope="col">Post Name</th>
          <th scope="col" className={styles.statusColumn}>
            Status
          </th>
          <th scope="col" className={styles.liveOnColumn}>
            Live on
          </th>
          {/* Named for screen readers; the ⋮ buttons need no visible heading. */}
          <th scope="col" className={styles.actionsColumn}>
            <span className={styles.visuallyHidden}>Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {posts.map((post) => (
          <tr key={post.id}>
            <td data-label="Created">
              {new Date(post.createdAt).toLocaleDateString()}
            </td>
            <td data-label="Post Name" className={styles.wrapCell}>
              <Link href={`/dashboard/post/${post.id}`}>{post.postName}</Link>
            </td>
            <td data-label="Status">
              <Pill
                label={post.status}
                tone={post.status === "published" ? "green" : "red"}
              />
            </td>
            <td data-label="Live on">{liveOnDate(post)}</td>
            {/* Positioned, so the menu's list opens from this cell's edges. */}
            <td className={styles.actionsCell}>
              <PostActionsMenu
                post={post}
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
