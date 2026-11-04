// GalleryActionsMenu (site owner): a gallery row's ⋮ menu on /dashboard: View, Edit, the status
// item (saved straight away) and Delete, whose confirmation the dashboard owns.

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
