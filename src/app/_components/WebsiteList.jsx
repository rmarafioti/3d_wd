// WebsiteList (site owner): each of the owner's websites on /dashboard, under a "Website: {name}"
// heading, with its posts (PostTable) and then its galleries (GalleryTable), each under its own
// heading. The dashboard owns every request and confirmation: onPostStatusChange and onDeletePost
// go to the post rows' menus, onGalleryStatusChange and onDeleteGallery to the gallery rows'.

import PostTable from "./PostTable";
import GalleryTable from "./GalleryTable";

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

  return websites.map((website) => (
    <section key={website.id} className={styles.postList}>
      <h2 className={styles.websiteHeader}>Website: {website.websiteName}</h2>
      <h3 className={styles.tableHeader}>Posts</h3>
      <PostTable
        posts={website.posts}
        onStatusChange={onPostStatusChange}
        onDelete={onDeletePost}
      />
      <h3 className={styles.tableHeader}>Galleries</h3>
      <GalleryTable
        galleries={website.galleries}
        onStatusChange={onGalleryStatusChange}
        onDelete={onDeleteGallery}
      />
    </section>
  ));
}
