// AbilitiesAside (site owner): the Abilities panel at the top right of /dashboard, built like the
// admin's Accounts aside. Closed by default; its toggle opens, over the page content, each of the
// site owner's websites with every ability in the catalog (Posts, Photo Galleries): its pill
// (AbilityPill, with prompts: "Add ?" while not added, "Turn On ?" while turned off; for Posts,
// then a "requested" PlacementPill while they wait to be placed) and a ⋮ menu with what its state
// allows: "Edit placement" once the posts request form was sent (Feature 13), "+ Add" while not
// added, Turn On / Turn Off once live, and Remove once added (Photo Galleries only). On / off is a
// menu choice, not a switch (Rich, 2026-11-02). Owns those requests and their dialogs, as
// AccountsAside owns Link a Website, so they stay open if the panel closes; onChange (the
// dashboard's refetch) runs after each success. Add and Turn On / Off save straight away, since
// each is undone in one motion; Remove deletes the website's galleries, so it asks first. A
// gallery's own request form is edited on its page.

"use client";

import { useState } from "react";
import { GoTriangleDown, GoTriangleRight } from "react-icons/go";
import { useAbilities } from "../_hooks/useAbilities";
import {
  ABILITY_KINDS,
  findAbility,
  postsRequestCopy,
} from "../_lib/abilities";
import AbilityPill from "./AbilityPill";
import AbilityRequestDialog from "./AbilityRequestDialog";
import PlacementPill from "./PlacementPill";
import ActionsMenu from "./ActionsMenu";
import ConfirmDialog from "./ConfirmDialog";
import MessageDialog from "./MessageDialog";

import asideStyles from "../_styling/accountsAside.module.css";
import styles from "../_styling/abilitiesAside.module.css";

// How long the backend keeps a removed ability's galleries before their images are deleted
// (docs/api.md → Notes, Abilities): adding it back within this time restores them.
const RESTORE_DAYS = 30;

// The last day the removed galleries can be brought back, as a local date ("December 2, 2026").
function restoreByDate() {
  const date = new Date(Date.now() + RESTORE_DAYS * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AbilitiesAside({ websites, onChange }) {
  const abilities = useAbilities();
  const [open, setOpen] = useState(false);
  // The ability whose Remove confirmation is open, or null.
  const [removing, setRemoving] = useState(null);
  // The posts request form being edited, { website, ability }, or null.
  const [editingRequest, setEditingRequest] = useState(null);
  // A failed request's message, held only while its dialog is open.
  const [actionError, setActionError] = useState(null);

  const ToggleIcon = open ? GoTriangleDown : GoTriangleRight;

  async function run(request) {
    try {
      await request();
      onChange();
    } catch (err) {
      setActionError(err.message);
    }
  }

  // The edit is saved, which puts the ability back to requested: the refetch moves its pill.
  function handleRequestEdited() {
    setEditingRequest(null);
    onChange();
  }

  // The confirm dialog closes first, like Delete Post's.
  function confirmRemove() {
    const ability = removing;
    setRemoving(null);
    run(() => abilities.remove(ability.id));
  }

  // What the ability's state allows (docs/flows.md → Abilities aside). An empty list shows no ⋮.
  function menuItems(website, entry, ability) {
    if (!ability) {
      return [
        {
          label: "+ Add",
          onClick: () => run(() => abilities.add(website.id, entry.kind)),
        },
      ];
    }
    const items = [];
    // Only the posts form is the ability's; each gallery's is edited on its page.
    if (entry.kind === "posts" && ability.requestedAt) {
      items.push({
        label: "Edit placement",
        onClick: () => setEditingRequest({ website, ability }),
      });
    }
    if (ability.status === "live") {
      items.push({
        label: ability.turnedOn ? "Turn Off" : "Turn On",
        onClick: () =>
          run(() => abilities.setTurnedOn(ability.id, !ability.turnedOn)),
      });
    }
    if (entry.removable) {
      items.push({ label: "Remove", onClick: () => setRemoving(ability) });
    }
    return items;
  }

  return (
    <aside
      aria-label="Abilities"
      className={`${asideStyles.aside} ${open ? asideStyles.open : asideStyles.closed}`}
    >
      {/* aria-label keeps the name "Abilities" at phone width, where the text is hidden while closed. */}
      <button
        type="button"
        aria-label="Abilities"
        aria-expanded={open}
        aria-controls="abilities-panel"
        onClick={() => setOpen((current) => !current)}
        className={asideStyles.toggle}
      >
        <ToggleIcon aria-hidden="true" />
        <span className={asideStyles.toggleText}>Abilities</span>
      </button>

      {open && (
        <div id="abilities-panel" className={asideStyles.panel}>
          {websites.map((website) => (
            <section key={website.id} className={styles.website}>
              <h2
                className={`${styles.websiteHeader} ${asideStyles.fullWidth}`}
              >
                Website: {website.websiteName}
              </h2>
              <ul className={styles.abilityList}>
                {ABILITY_KINDS.map((entry) => {
                  const ability = findAbility(website, entry.kind);
                  const items = menuItems(website, entry, ability);
                  return (
                    <li
                      key={entry.kind}
                      className={`${styles.ability} ${styles.abilityRow} ${asideStyles.fullWidth}`}
                    >
                      <span className={styles.abilityName}>{entry.label}</span>
                      <AbilityPill ability={ability} prompts />
                      {/* Posts waiting to be placed: a second pill only then, since once the admin
                          sets them live the status pill already reads "live" (Rich, 2026-11-03).
                          Each gallery's placement is on its page. */}
                      {entry.kind === "posts" &&
                        ability?.placement === "requested" && (
                          <PlacementPill placement="requested" />
                        )}
                      {/* Always there, empty without a ⋮, so every row's pill lines up. */}
                      <span className={styles.menu}>
                        {items.length > 0 && (
                          <ActionsMenu
                            label={`Actions for ${entry.label} on ${website.websiteName}`}
                            items={items}
                          />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {removing && (
        <ConfirmDialog
          message={`Your galleries will be hidden now and deleted for good after ${RESTORE_DAYS} days. Add Photo Galleries again before ${restoreByDate()} to get them back.`}
          confirmLabel="Remove"
          onConfirm={confirmRemove}
          onClose={() => setRemoving(null)}
        />
      )}
      {editingRequest && (
        <AbilityRequestDialog
          {...postsRequestCopy(editingRequest.website)}
          initialNote={editingRequest.ability.requestNote}
          onSubmit={(requestNote) =>
            abilities.editRequest(editingRequest.ability.id, requestNote)
          }
          onSent={handleRequestEdited}
          onCancel={() => setEditingRequest(null)}
        />
      )}
      {actionError && (
        <MessageDialog
          message={actionError}
          onClose={() => setActionError(null)}
        />
      )}
    </aside>
  );
}
