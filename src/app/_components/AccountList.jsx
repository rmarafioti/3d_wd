// AccountList (admin): every website with a site owner, each a disclosure holding its URL, its site
// owners with a ⋮ to link a website, and its abilities with their items and Live switches.

import { GoTriangleRight } from "react-icons/go";
import {
  ABILITY_KINDS,
  ABILITY_PILL_TONES,
  abilityPillLabel,
  findAbility,
  placementTone,
} from "../_lib/abilities";
import ActionsMenu from "./ActionsMenu";
import Pill from "./Pill";
import Toggle from "./Toggle";

import styles from "../_styling/dashPages.module.css";
import abilityStyles from "../_styling/abilitiesAside.module.css";
import asideStyles from "../_styling/accountsAside.module.css";

function yesNo(value) {
  return value ? "Yes" : "No";
}

// The site owner's request note, shown as "Placement note" right under the Placement pill it
// explains: where on their website something goes, once sent, the posts' (their ability's) or one
// gallery's. Line breaks kept. A term and its value, so it goes inside a <dl>.
function RequestNote({ note }) {
  if (!note) return null;
  return (
    <>
      <dt className={styles.key}>Placement note:</dt>
      <dd className={styles.requestNote}>{note}</dd>
    </>
  );
}

// A post's or gallery's "published" / "draft" pill, as on the dashboard's tables.
function ItemStatus({ status }) {
  return (
    <Pill label={status} tone={status === "published" ? "green" : "red"} />
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
// live first), then the photo count and the crop flags, Yes only when every image has that crop
// (the backend's rule), each a row with its label at the left and its value at the right, like the
// rows with a pill. The flags are there because crops aren't files, so Cloudinary never shows them.
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
              {/* The code the site owner sees on their dashboard, so both can name the gallery. */}
              <div className={styles.itemRow}>
                <dt className={styles.key}>Gallery Code:</dt>
                <dd>{gallery.slug}</dd>
              </div>
              {gallery.placement && (
                <div className={styles.itemRow}>
                  <dt className={styles.key}>Placement:</dt>
                  <dd className={styles.pillGroup}>
                    <Pill
                      label={gallery.placement}
                      tone={placementTone(gallery.placement)}
                    />
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
              <RequestNote note={gallery.requestNote} />
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
          </details>
        </li>
      ))}
    </ul>
  );
}

// Whether the admin can set an ability live now (docs/api.md → Notes, Abilities): Photo
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
          const pillLabel = abilityPillLabel(ability);
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
                    <Pill
                      label={pillLabel}
                      tone={ABILITY_PILL_TONES[pillLabel]}
                    />
                    {/* Posts waiting to be placed, as on the site owner's aside: once set live the
                        status pill already reads "live". Each gallery's placement is in its
                        dropdown. */}
                    {kind === "posts" && ability.placement === "requested" && (
                      <Pill label="requested" tone="purple" />
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
                {/* Posts' note right under their header, which holds their placement pill. Each
                    gallery's is under its own Placement, inside its dropdown. */}
                {kind === "posts" && ability.requestNote && (
                  <dl className={styles.postsNote}>
                    <RequestNote note={ability.requestNote} />
                  </dl>
                )}
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
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// The API lists accounts, each with its websites, but a website can have more than one site owner,
// so the list is by website: each website once, with the accounts linked to it, sorted by name.
// Its abilities, posts and galleries are the website's, the same on every account that has it, so
// the first account's copy is used. An account with no website isn't listed: it doesn't count yet.
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

// Shows names, statuses, counts, yes / no and the site owner's notes only, never post content or
// gallery images.
export default function AccountList({
  accounts,
  loading,
  error,
  onLink,
  onMessage,
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
              <Pill
                label={website.active ? "active" : "inactive"}
                tone={website.active ? "green" : "red"}
              />
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
                    <Pill
                      label={account.active ? "active" : "inactive"}
                      tone={account.active ? "green" : "red"}
                    />
                    <span className={abilityStyles.menu}>
                      <ActionsMenu
                        label={`Actions for ${account.name}`}
                        items={[
                          {
                            label: "Message",
                            onClick: () => onMessage(account),
                          },
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
