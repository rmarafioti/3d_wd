// AbilitiesAside (site owner): the Abilities panel on every /dashboard route, each website's
// abilities with their pills and a ⋮ menu of what each ability's state allows.

"use client";

import { useState } from "react";
import { GoTriangleDown, GoTriangleRight } from "react-icons/go";
import { useAbilities } from "../_hooks/useAbilities";
import {
  ABILITY_KINDS,
  ABILITY_PILL_TONES,
  abilityPillLabel,
  findAbility,
  postsRequestCopy,
} from "../_lib/abilities";
import AbilityInfo from "./AbilityInfo";
import AbilityRequestDialog from "./AbilityRequestDialog";
import ActionsMenu from "./ActionsMenu";
import ConfirmDialog from "./ConfirmDialog";
import MessageDialog from "./MessageDialog";
import Pill from "./Pill";

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
  // The aside owns its requests and their dialogs, as AccountsAside owns Link a Website, so they
  // stay open if the panel closes.
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
  // Add and Turn On / Off save straight away, since each is undone in one motion; Remove deletes
  // the website's galleries, so it asks first.
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
                  const pillLabel = abilityPillLabel(ability, {
                    prompts: true,
                  });
                  return (
                    <li
                      key={entry.kind}
                      className={`${styles.ability} ${styles.abilityRow} ${asideStyles.fullWidth}`}
                    >
                      {/* The "i" inside the name's cell, so it sits just before the name; the name
                          keeps a span of its own text. */}
                      <span className={styles.abilityName}>
                        <AbilityInfo label={entry.label} info={entry.info} />{" "}
                        <span>{entry.label}</span>
                      </span>
                      <Pill
                        label={pillLabel}
                        tone={ABILITY_PILL_TONES[pillLabel]}
                      />
                      {/* Posts waiting to be placed: a second pill only then, since once the admin
                          sets them live the status pill already reads "live". Each gallery's
                          placement is on its page and its gallery table row. */}
                      {entry.kind === "posts" &&
                        ability?.placement === "requested" && (
                          <Pill label="requested" tone="purple" />
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
