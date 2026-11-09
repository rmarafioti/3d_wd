// DeletedItemTable: a role's Recently Deleted, a row per post, gallery, update or thread with a
// checkbox and its days left. RecentlyDeleted owns the selection and the restore request.

import SelectAllCheckbox from "../controls/SelectAllCheckbox";
import Pill from "../controls/Pill";

import styles from "../../_styling/postTable.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;

// The type pill's words and tones: a thread reads "message", as in the mailbox.
const PILL_BY_TYPE = {
  post: { label: "post", tone: "plain" },
  gallery: { label: "gallery", tone: "plain" },
  update: { label: "update", tone: "plain" },
  thread: { label: "message", tone: "purple" },
};

// Items of different types may share an id, so a row is keyed by both.
export function deletedItemKey(item) {
  return `${item.type}-${item.id}`;
}

// Counted from restorableUntil only, never from a 30 of our own, since the window may change
// (docs/api.md → Notes). Rounded up, so an item still listed always has at least 1 day.
function daysLeft(restorableUntil) {
  const days = Math.max(
    1,
    Math.ceil((Date.parse(restorableUntil) - Date.now()) / DAY_MS),
  );
  return days === 1 ? "1 day" : `${days} days`;
}

export default function DeletedItemTable({ items, showWebsite, selection }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col" className={styles.selectColumn}>
            <SelectAllCheckbox
              checked={selection.allSelected}
              indeterminate={selection.someSelected}
              onChange={selection.toggleAll}
            />
          </th>
          <th scope="col" className={styles.typeColumn}>
            Type
          </th>
          {/* Only for an account with more than one website, to tell same-named posts apart. */}
          {showWebsite && <th scope="col">Website</th>}
          <th scope="col">Name</th>
          <th scope="col" className={styles.daysColumn}>
            Days left
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const pill = PILL_BY_TYPE[item.type];
          return (
            <tr key={deletedItemKey(item)}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${item.name}`}
                  checked={selection.isSelected(item)}
                  onChange={() => selection.toggle(item)}
                />
              </td>
              <td>
                <Pill label={pill.label} tone={pill.tone} />
              </td>
              {/* Empty for mail, which belongs to no website. */}
              {showWebsite && (
                <td className={styles.wrapCell}>{item.websiteName}</td>
              )}
              {/* Plain text, not a link: a deleted item's page is "not found" until restored. */}
              <td className={styles.wrapCell}>{item.name}</td>
              <td>{daysLeft(item.restorableUntil)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
