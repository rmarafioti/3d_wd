// AccountList (admin): every site owner account (active and inactive, sorted by name as the
// API returns them): site owner, email and status. Each account's "Websites" disclosure holds the
// websites linked to it and a "Link a Website" button; AccountsAside owns the dialog it opens
// (onLink receives the account). Under each website, its galleries as a summary (name, status,
// photo count, and whether its images have thumbnail and mobile crops), so the admin can see what
// the site owner cropped, which Cloudinary never shows (Rich, 2026-10-31). Never shows post
// content or gallery images: counts and yes / no only.

import StatusPill from "./StatusPill";

import styles from "../_styling/dashPages.module.css";

function yesNo(value) {
  return value ? "Yes" : "No";
}

// One website's galleries, under its link, laid out like the account above them (each label on
// its line, its value under it): the name and status pill, then the photo count and the crop
// flags: Yes only when every image has that crop (the backend's rule).
function GallerySummaries({ galleries }) {
  if (galleries.length === 0) {
    return <p className={styles.noGalleries}>No galleries yet.</p>;
  }
  return (
    <ul>
      {galleries.map((gallery) => (
        <li key={gallery.id} className={styles.gallerySummary}>
          <p className={styles.key}>Gallery Name:</p>
          <p className={styles.value}>{gallery.galleryName}</p>
          <StatusPill
            active={gallery.status === "published"}
            onLabel="published"
            offLabel="draft"
            className={styles.statusPill}
          />
          <p className={styles.key}>Photos:</p>
          <p className={styles.value}>{gallery.imageCount}</p>
          <p className={styles.key}>Thumbnails:</p>
          <p className={styles.value}>{yesNo(gallery.hasThumbnails)}</p>
          <p className={styles.key}>Mobile crop:</p>
          <p className={styles.value}>{yesNo(gallery.hasMobileCrops)}</p>
        </li>
      ))}
    </ul>
  );
}

export default function AccountList({ accounts, loading, error, onLink }) {
  if (error) return <p>{error.message}</p>;
  if (loading && !accounts) return <p>Loading…</p>;
  if (accounts.length === 0) return <p>No site owner accounts yet.</p>;

  return (
    <ul className={styles.accountList}>
      {accounts.map((account) => (
        <li key={account.id} className={styles.account}>
          <p className={styles.key}>Site Owner:</p>
          <p className={styles.value}>{account.name}</p>
          <p className={styles.key}>Email:</p>
          <p className={styles.value}>{account.email}</p>
          <StatusPill active={account.active} className={styles.statusPill} />
          <details>
            <summary className={styles.key}>Websites</summary>
            {account.websites.length === 0 ? (
              <p>No websites linked.</p>
            ) : (
              <ul className={styles.websites}>
                {account.websites.map((website) => (
                  <li key={website.id}>
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {website.websiteName}
                    </a>{" "}
                    <StatusPill active={website.active} />
                    <GallerySummaries galleries={website.galleries} />
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => onLink(account)}
              className={styles.linkWebsiteButton}
            >
              Link a Website
            </button>
          </details>
        </li>
      ))}
    </ul>
  );
}
