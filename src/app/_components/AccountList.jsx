// AccountList (admin): every site owner account (active and inactive, sorted by name as the API
// returns them), each a disclosure named by the site owner, closed by default, so the open aside
// first reads as a list of names, each with its status pill at the right of its row (Rich,
// 2026-11-02). Opened: the site owner and email, then a "Websites" disclosure holding the websites
// linked to the account and a "Link a Website" button; AccountsAside owns the dialog it opens
// (onLink receives the account). Under each website, an "Abilities" section: each ability the
// website has, a disclosure closed by default whose summary holds its name, pill and, while
// requested, a Live switch (onSetLive, whose confirmation AccountsAside owns; gone once live, since
// the app can't undo it). Opened: its items by name with their status pills; for posts, then the
// site owner's request note. The items are the posts, or the galleries, each a disclosure holding
// its photo count, whether its images have thumbnail and mobile crops (which Cloudinary never
// shows, Rich 2026-10-31) and its own request note. Every row with a pill has its name at the left
// and its pill at the right. Never shows post content or gallery images: names, statuses, counts,
// yes / no and the site owner's notes only.

import { GoTriangleRight } from "react-icons/go";
import { ABILITY_KINDS, findAbility } from "../_lib/abilities";
import AbilityPill from "./AbilityPill";
import StatusPill from "./StatusPill";
import Toggle from "./Toggle";

import styles from "../_styling/dashPages.module.css";
import abilityStyles from "../_styling/abilitiesAside.module.css";
import asideStyles from "../_styling/accountsAside.module.css";

function yesNo(value) {
  return value ? "Yes" : "No";
}

// The site owner's request note, saying where on their website something goes, once sent: the
// posts' (their ability's) or one gallery's. Line breaks kept.
function RequestNote({ note }) {
  if (!note) return null;
  return (
    <>
      <p className={styles.key}>Request note:</p>
      <p className={styles.requestNote}>{note}</p>
    </>
  );
}

// A post's or gallery's "published" / "draft" pill, as on the dashboard's tables.
function ItemStatus({ status }) {
  return (
    <StatusPill
      active={status === "published"}
      onLabel="published"
      offLabel="draft"
    />
  );
}

function PostItems({ posts }) {
  if (posts.length === 0)
    return <p className={styles.noItems}>No posts yet.</p>;
  return (
    <ul className={styles.items}>
      {posts.map((post) => (
        <li key={post.id} className={styles.itemRow}>
          <span>{post.postName}</span>
          <ItemStatus status={post.status} />
        </li>
      ))}
    </ul>
  );
}

// Each gallery's summary opens from its name, like the Websites disclosure: the photo count and
// the crop flags, Yes only when every image has that crop (the backend's rule), each a row with
// its label at the left and its value at the right, like the rows with a pill.
function GalleryItems({ galleries }) {
  if (galleries.length === 0) {
    return <p className={styles.noItems}>No galleries yet.</p>;
  }
  return (
    <ul className={styles.items}>
      {galleries.map((gallery) => (
        <li key={gallery.id}>
          <details>
            <summary
              className={`${styles.summaryRow} ${styles.gallerySummaryName}`}
            >
              <GoTriangleRight aria-hidden="true" className={styles.marker} />
              <span className={styles.summaryName}>{gallery.galleryName}</span>
              <ItemStatus status={gallery.status} />
            </summary>
            <dl className={styles.gallerySummary}>
              {[
                ["Photos:", gallery.imageCount],
                ["Thumbnails:", yesNo(gallery.hasThumbnails)],
                ["Mobile crop:", yesNo(gallery.hasMobileCrops)],
              ].map(([label, value]) => (
                <div key={label} className={styles.itemRow}>
                  <dt className={styles.key}>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <RequestNote note={gallery.requestNote} />
          </details>
        </li>
      ))}
    </ul>
  );
}

// One website's "Abilities" section, in the catalog's order, leaving out any it hasn't added.
function Abilities({ website, onSetLive }) {
  return (
    <section className={styles.abilities}>
      <h3
        className={`${styles.key} ${styles.abilitiesHeader} ${asideStyles.fullWidth}`}
      >
        Abilities
      </h3>
      <ul>
        {ABILITY_KINDS.map(({ kind, label }) => {
          const ability = findAbility(website, kind);
          if (!ability) return null;
          return (
            <li
              key={kind}
              className={`${abilityStyles.ability} ${asideStyles.fullWidth}`}
            >
              <details className={styles.abilityDetails}>
                <summary
                  className={`${styles.summaryRow} ${styles.abilityHeader} ${asideStyles.fullWidth}`}
                >
                  <GoTriangleRight
                    aria-hidden="true"
                    className={styles.marker}
                  />
                  <span className={`${styles.key} ${styles.summaryName}`}>
                    {label}
                  </span>
                  <span className={styles.pillGroup}>
                    <AbilityPill ability={ability} />
                    {/* Only while requested: going live can't be undone, so a live ability
                          has nothing to switch (Rich, 2026-11-02). */}
                    {ability.status === "requested" && (
                      // A click on the switch would also open or close the disclosure it
                      // sits in; preventing the click's default stops that, and the switch
                      // has already called onChange.
                      <span onClick={(event) => event.preventDefault()}>
                        <Toggle
                          label={`${label} live for ${website.websiteName}`}
                          checked={false}
                          onChange={() => onSetLive(ability, website)}
                          statusColors
                        />
                      </span>
                    )}
                  </span>
                </summary>
                {kind === "posts" ? (
                  <PostItems posts={website.posts} />
                ) : (
                  <GalleryItems galleries={website.galleries} />
                )}
                {/* Under the posts, since it says where they go on the website. Each gallery has its
                    own, inside its dropdown (Rich, 2026-11-02). */}
                {kind === "posts" && <RequestNote note={ability.requestNote} />}
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function AccountList({
  accounts,
  loading,
  error,
  onLink,
  onSetLive,
}) {
  if (error) return <p>{error.message}</p>;
  if (loading && !accounts) return <p>Loading…</p>;
  if (accounts.length === 0) return <p>No site owner accounts yet.</p>;

  return (
    <ul className={styles.accountList}>
      {accounts.map((account) => (
        <li
          key={account.id}
          className={`${styles.account} ${asideStyles.fullWidth}`}
        >
          <details className={styles.disclosure}>
            <summary className={`${styles.key} ${styles.summaryRow}`}>
              <GoTriangleRight aria-hidden="true" className={styles.marker} />
              <span className={styles.summaryName}>{account.name}</span>
              <StatusPill active={account.active} />
            </summary>
            <div className={styles.accountDetails}>
              <p className={styles.key}>Site Owner:</p>
              <p className={styles.value}>{account.name}</p>
              <p className={styles.key}>Email:</p>
              <p className={styles.value}>{account.email}</p>
              <details className={styles.disclosure}>
                <summary className={`${styles.key} ${styles.summaryRow}`}>
                  <GoTriangleRight
                    aria-hidden="true"
                    className={styles.marker}
                  />
                  <span className={styles.summaryName}>Websites</span>
                </summary>
                {account.websites.length === 0 ? (
                  <p>No websites linked.</p>
                ) : (
                  <ul className={styles.websites}>
                    {account.websites.map((website) => (
                      <li key={website.id}>
                        <div className={styles.itemRow}>
                          <a
                            href={website.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {website.websiteName}
                          </a>
                          <StatusPill active={website.active} />
                        </div>
                        <Abilities website={website} onSetLive={onSetLive} />
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
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
