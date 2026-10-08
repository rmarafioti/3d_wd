// LinkFields: the "add another" link list for Create and Edit a Post. Handles add/delete,
// validation and the 10-link limit.
//
// Controlled by the parent form, which owns the links array and passes its React state setter
// (setLinks) so every change is a functional update. Each link has a client-only `key` for React
// lists (stripped before sending); links loaded for Edit also keep their real `id` so the backend
// can reconcile them. A new link starts as a draft held here; it joins the array only when its
// "Add" button validates it. fieldErrors is the API's error.fields, keyed by full path
// ("links.0.url").

"use client";

import { useState } from "react";
import ItemFields, { serverErrorsFor } from "./ItemFields";
import { validateLink } from "../_lib/validation";

const MAX_LINKS = 10;

const EMPTY_LINK = { name: "", url: "" };

const LINK_FIELDS = [
  { name: "name", label: "Link Name", type: "text", maxLength: 100 },
  { name: "url", label: "URL", type: "url" },
];

export default function LinkFields({
  links,
  setLinks,
  fieldErrors,
  onReindex,
}) {
  // The unsaved new link, or null when its fields are hidden.
  const [draft, setDraft] = useState(null);
  // Set once "Add" is pressed on an invalid draft, so all its messages show.
  const [draftTried, setDraftTried] = useState(false);

  const full = links.length >= MAX_LINKS;

  function patchLink(key, changes) {
    setLinks((list) =>
      list.map((link) => (link.key === key ? { ...link, ...changes } : link)),
    );
  }

  function startDraft() {
    setDraft({ ...EMPTY_LINK, key: crypto.randomUUID() });
    setDraftTried(false);
  }

  function addDraft() {
    if (Object.keys(validateLink(draft)).length > 0) {
      setDraftTried(true);
      return;
    }
    setLinks((list) => [...list, draft]);
    setDraft(null);
    onReindex();
  }

  function deleteLink(key) {
    setLinks((list) => list.filter((link) => link.key !== key));
    onReindex();
  }

  return (
    <fieldset>
      <legend>Links</legend>
      {fieldErrors.links && <p>{fieldErrors.links}</p>}

      {links.map((link, index) => (
        <div key={link.key}>
          <ItemFields
            fields={LINK_FIELDS}
            validate={validateLink}
            value={link}
            onPatch={(changes) => patchLink(link.key, changes)}
            serverErrors={serverErrorsFor(fieldErrors, `links.${index}.`)}
            showAllErrors
          />
          {/* Names the link for screen readers, so each Delete can be told apart. */}
          <button
            type="button"
            aria-label={`Delete link ${index + 1}`}
            onClick={() => deleteLink(link.key)}
          >
            Delete
          </button>
        </div>
      ))}

      {draft ? (
        <div>
          <ItemFields
            fields={LINK_FIELDS}
            validate={validateLink}
            value={draft}
            onPatch={(changes) =>
              setDraft((current) => ({ ...current, ...changes }))
            }
            serverErrors={{}}
            showAllErrors={draftTried}
          />
          <button type="button" onClick={addDraft}>
            Add
          </button>
          <button type="button" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" disabled={full} onClick={startDraft}>
          {full ? `Maximum of ${MAX_LINKS} links` : "Add link"}
        </button>
      )}
    </fieldset>
  );
}
