// RowActionsMenu (site owner): a post or gallery row's ⋮ menu on /dashboard, with shortcuts to what
// its own page offers. The dashboard owns the status request and the delete's confirmation.

"use client";

import ActionsMenu from "../../controls/ActionsMenu";

// path: the row's own page (/dashboard/post/{id} or /dashboard/gallery/{id}). name: its post or
// gallery name. onStatusChange(nextStatus) and onDelete() are bound to the row by the table.
export default function RowActionsMenu({
  path,
  name,
  status,
  onStatusChange,
  onDelete,
}) {
  const isPublished = status === "published";
  const items = [
    { label: "View", href: path },
    { label: "Edit", href: `${path}?edit=1` },
    // Worded to match the table's Status column.
    {
      label: isPublished ? "Status to draft" : "Status to publish",
      onClick: () => onStatusChange(isPublished ? "draft" : "published"),
    },
    { label: "Delete", onClick: onDelete },
  ];

  return (
    <ActionsMenu
      label={`Actions for ${name}`}
      items={items}
      phoneLabel="Actions"
    />
  );
}
