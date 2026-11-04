// PostTable (site owner): one website's posts on /dashboard, a row each with its ⋮ menu. The
// dashboard owns the requests behind onStatusChange and onDelete, and the delete's confirmation.

import Link from "next/link";

import Pill from "./Pill";
import PostActionsMenu from "./PostActionsMenu";

import styles from "../_styling/postTable.module.css";

export default function PostTable({ posts, onStatusChange, onDelete }) {
  if (posts.length === 0) return <p>No posts yet.</p>;

  return (
    <table className={styles.table}>
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
          {/* Named for screen readers; the ⋮ buttons need no visible heading. */}
          <th scope="col" className={styles.actionsColumn}>
            <span className={styles.visuallyHidden}>Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {posts.map((post) => (
          <tr key={post.id}>
            <td>{new Date(post.createdAt).toLocaleDateString()}</td>
            <td>
              <Link href={`/dashboard/post/${post.id}`}>{post.postName}</Link>
            </td>
            <td>
              <Pill
                label={post.status}
                tone={post.status === "published" ? "green" : "red"}
              />
            </td>
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
