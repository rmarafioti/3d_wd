// WebsiteList (site owner): each website on /dashboard with its posts' placement and post table and,
// once it has Photo Galleries, its gallery table. The dashboard owns every request and confirmation.

import Pill from "./Pill";
import PostTable from "./PostTable";
import GalleryTable from "./GalleryTable";
import { findAbility, placementTone } from "../_lib/abilities";

import styles from "../_styling/postTable.module.css";

export default function WebsiteList({
  websites,
  loading,
  error,
  onPostStatusChange,
  onDeletePost,
  onGalleryStatusChange,
  onDeleteGallery,
}) {
  if (error) return <p>{error.message}</p>;
  if (loading && !websites) return <p>Loading…</p>;
  if (websites.length === 0) return <p>You have no websites yet.</p>;

  return websites.map((website) => {
    const postsPlacement = findAbility(website, "posts")?.placement;
    return (
      <section key={website.id} className={styles.postList}>
        <h2 className={styles.websiteHeader}>Website: {website.websiteName}</h2>
        <h3 className={styles.tableHeader}>Posts</h3>
        {/* Shown with or without posts, so a live placement with none yet reads as intended.
            Nothing before the request form is sent. */}
        {postsPlacement && (
          <p className={styles.placementRow}>
            <span className={styles.placementLabel}>Placement:</span>
            <Pill label={postsPlacement} tone={placementTone(postsPlacement)} />
          </p>
        )}
        <PostTable
          posts={website.posts}
          onStatusChange={onPostStatusChange}
          onDelete={onDeletePost}
        />
        {findAbility(website, "galleries") && (
          <>
            <h3 className={styles.tableHeader}>Galleries</h3>
            <GalleryTable
              galleries={website.galleries}
              onStatusChange={onGalleryStatusChange}
              onDelete={onDeleteGallery}
            />
          </>
        )}
      </section>
    );
  });
}
