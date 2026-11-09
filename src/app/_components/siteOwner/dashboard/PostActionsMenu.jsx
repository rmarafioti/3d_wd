// PostActionsMenu (site owner): a post row's ⋮ menu on /dashboard, with shortcuts to what the post
// page offers. The dashboard owns the status request and the delete's confirmation.

"use client";

import ActionsMenu from "../../controls/ActionsMenu";

export default function PostActionsMenu({ post, onStatusChange, onDelete }) {
  const postPath = `/dashboard/post/${post.id}`;
  const isPublished = post.status === "published";
  const items = [
    { label: "View", href: postPath },
    { label: "Edit", href: `${postPath}?edit=1` },
    // Worded to match the table's Status column.
    {
      label: isPublished ? "Status to draft" : "Status to publish",
      onClick: () => onStatusChange(post, isPublished ? "draft" : "published"),
    },
    { label: "Delete", onClick: () => onDelete(post) },
  ];

  return (
    <ActionsMenu
      label={`Actions for ${post.postName}`}
      items={items}
      phoneLabel="Actions"
    />
  );
}
