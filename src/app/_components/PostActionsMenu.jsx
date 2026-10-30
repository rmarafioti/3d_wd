// PostActionsMenu (site owner): the ⋮ menu at the end of each post's row on /dashboard (the shared
// ActionsMenu), with shortcuts to what the post page offers: View, Edit (the post page with its
// Edit form open), Status ("Status to publish" on a draft, "Status to draft" on a published post,
// worded to match the table's Status column: onStatusChange, which saves straight away, since it
// can be undone) and Delete (onDelete, whose confirmation the dashboard owns). Its list opens from
// PostList's actions cell.

"use client";

import ActionsMenu from "./ActionsMenu";

export default function PostActionsMenu({ post, onStatusChange, onDelete }) {
  const postPath = `/dashboard/post/${post.id}`;
  const isPublished = post.status === "published";
  const items = [
    { label: "View", href: postPath },
    { label: "Edit", href: `${postPath}?edit=1` },
    {
      label: isPublished ? "Status to draft" : "Status to publish",
      onClick: () => onStatusChange(post, isPublished ? "draft" : "published"),
    },
    { label: "Delete", onClick: () => onDelete(post) },
  ];

  return <ActionsMenu label={`Actions for ${post.postName}`} items={items} />;
}
