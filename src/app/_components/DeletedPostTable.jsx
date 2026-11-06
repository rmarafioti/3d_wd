// DeletedPostTable (site owner): the posts deleted in the last 30 days, a row each with its days
// left and a Restore button. The Recently Deleted page owns the restore request.

import Pill from "./Pill";

import styles from "../_styling/postTable.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;

// Counted from restorableUntil only, never from a 30 of our own, since the window may change
// (docs/api.md → Notes). Rounded up, so a post still listed always has at least 1 day.
function daysLeft(restorableUntil) {
  const days = Math.max(
    1,
    Math.ceil((Date.parse(restorableUntil) - Date.now()) / DAY_MS),
  );
  return days === 1 ? "1 day" : `${days} days`;
}

export default function DeletedPostTable({
  posts,
  showWebsite,
  restoringId,
  onRestore,
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {/* Only for an account with more than one website, to tell same-named posts apart. */}
          {showWebsite && <th scope="col">Website</th>}
          <th scope="col">Post Name</th>
          {/* The status the post comes back with, not a current one: a deleted post isn't live. */}
          <th scope="col" className={styles.statusColumn}>
            Restores as
          </th>
          <th scope="col" className={styles.daysColumn}>
            Days left
          </th>
          {/* Named for screen readers; each Restore button names its action. */}
          <th scope="col" className={styles.restoreColumn}>
            <span className={styles.visuallyHidden}>Restore</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {posts.map((post) => (
          <tr key={post.id}>
            {showWebsite && (
              <td className={styles.wrapCell}>{post.websiteName}</td>
            )}
            {/* Plain text, not a link: a deleted post's page is "Post not found." until restored. */}
            <td className={styles.wrapCell}>{post.postName}</td>
            <td>
              <Pill
                label={post.status}
                tone={post.status === "published" ? "green" : "red"}
              />
            </td>
            <td>{daysLeft(post.restorableUntil)}</td>
            {/* The whole cell is the button, so 50 rows don't read as 50 purple buttons. */}
            <td className={styles.restoreCell}>
              <button
                type="button"
                aria-label={`Restore ${post.postName}`}
                onClick={() => onRestore(post)}
                disabled={Boolean(restoringId)}
                className={styles.restoreButton}
              >
                {restoringId === post.id ? "Restoring…" : "Restore"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
