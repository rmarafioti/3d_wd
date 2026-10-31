// PostTable (site owner): one website's posts on /dashboard, in a table (published and draft,
// newest first as the API returns them): Created, Post Name (linking to /dashboard/post/{id}),
// Status, and each row's PostActionsMenu. Created, not the optional Post Date: every post has one,
// and Post Date is only what the site owner shows on their website. onStatusChange(post, status)
// and onDelete(post) are passed to each menu; the dashboard owns the requests and the delete's
// confirmation. WebsiteList renders it under the website's "Posts" heading.

import Link from "next/link";

import StatusPill from "./StatusPill";
import PostActionsMenu from "./PostActionsMenu";

import styles from "../_styling/postTable.module.css";

export default function PostTable({ posts, onStatusChange, onDelete }) {
  if (posts.length === 0) return <p>No posts yet.</p>;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
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
              <StatusPill
                active={post.status === "published"}
                onLabel="published"
                offLabel="draft"
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
