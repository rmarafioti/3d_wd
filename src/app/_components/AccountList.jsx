// AccountList (admin): every website with a site owner, each a disclosure named by the website,
// closed by default, so the open aside first reads as a list of website names, each with its
// status pill at the right of its row. A website can have more than one site owner, so the list is
// by website, not account (Rich, 2026-11-03). Opened: the website's URL, then each site owner
// linked to it (name, email, status and a ⋮ beside the status offering "Link a Website", which
// links another website to that account; AccountsAside owns the dialog it opens, onLink receives
// the account), then an "Abilities" section: each ability the website has, a disclosure closed by
// default whose summary holds its name, its status pill (AbilityPill), for posts waiting to be
// placed a "requested" PlacementPill, and a Live switch while it can be set live (onSetLive; gone
// once live, since the app can't undo it). Opened: its items by name with their status pills; for
// posts, then the site owner's request note. The items are the posts, or the galleries, each a
// disclosure holding its placement and, while requested with Photo Galleries live, its own Live
// switch (onSetGalleryLive), then its photo count, whether its images have thumbnail and mobile
// crops (which Cloudinary never shows, Rich 2026-10-31) and its own request note. AccountsAside
// owns both switches' confirmations. Every row with a pill has its name at the left and its pill
// at the right. Never shows post content or gallery images: names, statuses, counts, yes / no and
// the site owner's notes only.

import { GoTriangleRight } from "react-icons/go";
import { ABILITY_KINDS, findAbility } from "../_lib/abilities";
import AbilityPill from "./AbilityPill";
import PlacementPill from "./PlacementPill";
import ActionsMenu from "./ActionsMenu";
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

// Each gallery's summary opens from its name: its placement once its request message is sent,
// with a Live switch while requested once Photo Galleries is live (the backend needs the ability
// live first; Rich, 2026-11-03), then the photo count and the crop flags, Yes only when every image
// has that crop (the backend's rule), each a row with its label at the left and its value at the
// right, like the rows with a pill.
function GalleryItems({ galleries, galleriesLive, website, onSetGalleryLive }) {
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
              {gallery.placement && (
                <div className={styles.itemRow}>
                  <dt className={styles.key}>Placement:</dt>
                  <dd className={styles.pillGroup}>
                    <PlacementPill placement={gallery.placement} />
                    {galleriesLive && gallery.placement === "requested" && (
                      <Toggle
                        label={`${gallery.galleryName} live on ${website.websiteName}`}
                        checked={false}
                        onChange={() => onSetGalleryLive(gallery, website)}
                        statusColors
                      />
                    )}
                  </dd>
                </div>
              )}
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

// Whether the admin can set an ability live now (docs/api.md → Notes, Abilities, issue #71): Photo
// Galleries while still added, once its component is wired (no request needed); posts while their
// placement is requested, one switch setting their placement and status live together. Going live
// can't be undone, so a live ability has nothing to switch.
function canSetLive(kind, ability) {
  if (kind === "galleries") return ability.status === "added";
  return ability.placement === "requested";
}

// One website's "Abilities" section, in the catalog's order, leaving out any it hasn't added.
function Abilities({ website, onSetLive, onSetGalleryLive }) {
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
                    {/* Posts waiting to be placed, as on the site owner's aside: once set live the
                        status pill already reads "live" (Rich, 2026-11-03). Each gallery's
                        placement is in its dropdown. */}
                    {kind === "posts" && ability.placement === "requested" && (
                      <PlacementPill placement="requested" />
                    )}
                    {canSetLive(kind, ability) && (
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
                  <GalleryItems
                    galleries={website.galleries}
                    galleriesLive={ability.status === "live"}
                    website={website}
                    onSetGalleryLive={onSetGalleryLive}
                  />
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

// The API lists accounts, each with its websites, but a website can have more than one site owner,
// so the list is by website (Rich, 2026-11-03): each website once, with the accounts linked to it,
// sorted by name. Its abilities, posts and galleries are the website's, the same on every account
// that has it, so the first account's copy is used. An account with no website isn't listed: it
// doesn't count yet (Rich, 2026-11-03).
function websitesWithOwners(accounts) {
  const byId = new Map();
  for (const account of accounts) {
    for (const website of account.websites) {
      const entry = byId.get(website.id) ?? { website, owners: [] };
      entry.owners.push(account);
      byId.set(website.id, entry);
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.website.websiteName.localeCompare(b.website.websiteName),
  );
}

export default function AccountList({
  accounts,
  loading,
  error,
  onLink,
  onSetLive,
  onSetGalleryLive,
}) {
  if (error) return <p>{error.message}</p>;
  if (loading && !accounts) return <p>Loading…</p>;
  const websites = websitesWithOwners(accounts);
  if (websites.length === 0) return <p>No site owner accounts yet.</p>;

  return (
    <ul className={styles.accountList}>
      {websites.map(({ website, owners }) => (
        <li
          key={website.id}
          className={`${styles.account} ${asideStyles.fullWidth}`}
        >
          <details className={styles.disclosure}>
            <summary className={`${styles.key} ${styles.summaryRow}`}>
              <GoTriangleRight aria-hidden="true" className={styles.marker} />
              <span className={styles.summaryName}>{website.websiteName}</span>
              <StatusPill active={website.active} />
            </summary>
            <div className={styles.accountDetails}>
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.value}
              >
                {website.url}
              </a>
              {owners.map((account) => (
                <div key={account.id} className={styles.owner}>
                  {/* Positioned, so the ⋮ list opens from this row. */}
                  {/* Laid out like a row of the site owner's Abilities aside: the ⋮ in its
                      boxed cell with a line on its left, like every ⋮ in the app. */}
                  <div className={abilityStyles.abilityRow}>
                    <span className={abilityStyles.abilityName}>
                      Site Owner:
                    </span>
                    <StatusPill active={account.active} />
                    <span className={abilityStyles.menu}>
                      <ActionsMenu
                        label={`Actions for ${account.name}`}
                        items={[
                          {
                            label: "Link a Website",
                            onClick: () => onLink(account),
                          },
                        ]}
                      />
                    </span>
                  </div>
                  <p className={styles.value}>{account.name}</p>
                  <p className={styles.key}>Email:</p>
                  <p className={styles.value}>{account.email}</p>
                </div>
              ))}
              <Abilities
                website={website}
                onSetLive={onSetLive}
                onSetGalleryLive={onSetGalleryLive}
              />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
