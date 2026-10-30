// PostList (site owner): each of the owner's websites with its posts in a table (active and
// inactive, newest first as the API returns them): Created, Post Name (linking to
// /dashboard/post/{id}), Status, and each row's PostActionsMenu. Created, not the optional Post
// Date: every post has one, and Post Date is only what the site owner shows on their website. onDelete(post) is
// passed to each menu; the dashboard owns the delete's confirmation.

import Link from "next/link";

import StatusPill from "./StatusPill";
import PostActionsMenu from "./PostActionsMenu";

import styles from "../_styling/postTable.module.css";

export default function PostList({ websites, loading, error, onDelete }) {
  if (error) return <p>{error.message}</p>;
  if (loading && !websites) return <p>Loading…</p>;
  if (websites.length === 0) return <p>You have no websites yet.</p>;

  return websites.map((website) => (
    <section key={website.id} className={styles.postList}>
      <h2 className={styles.websiteHeader}>Website: {website.websiteName}</h2>
      {website.posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
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
            {website.posts.map((post) => (
              <tr key={post.id}>
                <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                <td>
                  <Link href={`/dashboard/post/${post.id}`}>
                    {post.postName}
                  </Link>
                </td>
                <td>
                  <StatusPill active={post.active} />
                </td>
                {/* Positioned, so the menu's list opens from this cell's edges. */}
                <td className={styles.actionsCell}>
                  <PostActionsMenu post={post} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  ));
}
