// GalleryActionsMenu (site owner): the ⋮ menu at the end of each gallery's row on /dashboard (the
// shared ActionsMenu), like PostActionsMenu: View, Edit (the gallery page with its Edit form open),
// Status ("Status to publish" on a draft, "Status to draft" on a published gallery:
// onStatusChange, which saves straight away, since it can be undone) and Delete (onDelete, whose
// confirmation the dashboard owns). Its list opens from GalleryTable's actions cell.

"use client";

import ActionsMenu from "./ActionsMenu";

export default function GalleryActionsMenu({
  gallery,
  onStatusChange,
  onDelete,
}) {
  const galleryPath = `/dashboard/gallery/${gallery.id}`;
  const isPublished = gallery.status === "published";
  const items = [
    { label: "View", href: galleryPath },
    { label: "Edit", href: `${galleryPath}?edit=1` },
    {
      label: isPublished ? "Status to draft" : "Status to publish",
      onClick: () =>
        onStatusChange(gallery, isPublished ? "draft" : "published"),
    },
    { label: "Delete", onClick: () => onDelete(gallery) },
  ];

  return (
    <ActionsMenu label={`Actions for ${gallery.galleryName}`} items={items} />
  );
}
