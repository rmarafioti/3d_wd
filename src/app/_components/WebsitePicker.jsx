// WebsitePicker: shared by Create an Account and Link a Website. Choose "Add new website" or an
// existing website; reports { websiteId } or { websiteName, websiteUrl }.
//
// Controlled: the parent form owns `value` ({ websiteId, websiteName, websiteUrl }) so it can
// validate and clear it. Picking an existing website fills and locks the name and URL fields;
// picking "Add new website" clears and unlocks them.

"use client";

import { useId } from "react";

export const EMPTY_WEBSITE = { websiteId: "", websiteName: "", websiteUrl: "" };

// What the picker reports to the API: the existing website's id, or the new website's details.
export function toWebsitePayload({ websiteId, websiteName, websiteUrl }) {
  if (websiteId) return { websiteId };
  return { websiteName: websiteName.trim(), websiteUrl: websiteUrl.trim() };
}

export default function WebsitePicker({
  websites,
  value,
  onChange,
  onBlur,
  fieldErrors,
}) {
  const id = useId();
  const isExisting = value.websiteId !== "";

  function handleSelect(event) {
    const website = websites.find((w) => w.id === event.target.value);
    onChange(
      website
        ? {
            websiteId: website.id,
            websiteName: website.websiteName,
            websiteUrl: website.url,
          }
        : EMPTY_WEBSITE,
    );
  }

  return (
    <fieldset>
      <legend>Website</legend>

      <label htmlFor={`${id}-select`}>Choose a website</label>
      <select
        id={`${id}-select`}
        value={value.websiteId}
        onChange={handleSelect}
      >
        <option value="">Add new website</option>
        {websites.map((website) => (
          <option key={website.id} value={website.id}>
            {website.websiteName}
          </option>
        ))}
      </select>

      <label htmlFor={`${id}-name`}>Website Name</label>
      <input
        id={`${id}-name`}
        type="text"
        maxLength={100}
        readOnly={isExisting}
        value={value.websiteName}
        onChange={(e) => onChange({ ...value, websiteName: e.target.value })}
        onBlur={() => onBlur("websiteName")}
      />
      {fieldErrors.websiteName && <p>{fieldErrors.websiteName}</p>}

      <label htmlFor={`${id}-url`}>Website URL</label>
      <input
        id={`${id}-url`}
        type="url"
        placeholder="https://www.yourwebsite.com"
        readOnly={isExisting}
        value={value.websiteUrl}
        onChange={(e) => onChange({ ...value, websiteUrl: e.target.value })}
        onBlur={() => onBlur("websiteUrl")}
      />
      {fieldErrors.websiteUrl && <p>{fieldErrors.websiteUrl}</p>}
    </fieldset>
  );
}
