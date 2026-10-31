// GalleryToolbar (site owner): the list beside the preview in Create / Edit a Gallery's review
// view, one row for every part of the gallery, each with a ⋮ menu (ToolbarRow), then its children:
// GalleryForm's Published switch (Create only) and Submit (docs/flows.md → Create a Gallery). The
// gallery's own fields and its images are two lists, with an "Images" heading between them, as
// PostToolbar does with its "Body".
// - Gallery name: Edit.
// - Title and copy: Edit and Delete, or only Add while empty.
// - Each image, in order, shown by its icon and alt text: Edit, a Move up and a Move down arrow
//   where it can move that way (they keep the menu open), and Delete, except on the only image.
// - Mobile shape (mobileShape, the gallery's, while any image has a mobile crop), in its own list
//   under the images, just above Submit: Edit, which changes it for every image.
// Each of the gallery's own fields names itself before its value ("Title: Inside"), unless it is
// empty, where its row's words ("No title") already do.
// Holds no gallery state: every action is a callback to GalleryForm. A backend field message
// shows under the row it belongs to, and cropIssues (crops.js) shows what the gallery's crops still
// lack: under "Images", and under each image that lacks it ("Needs a thumbnail crop.").

"use client";

import { useId } from "react";
import { GoChevronDown, GoChevronUp } from "react-icons/go";
import { MdImage } from "react-icons/md";
import ToolbarRow from "./ToolbarRow";
import { serverErrorsFor } from "./ImageField";
import { isBlank } from "../_lib/validation";
import {
  GALLERY_FIELDS,
  imageNames,
  OPTIONAL_GALLERY_FIELDS,
} from "../_lib/galleryFields";

import styles from "../_styling/postToolbar.module.css";

export default function GalleryToolbar({
  values,
  fieldErrors,
  cropIssues,
  mobileShape,
  onEditField,
  onDeleteField,
  onEditImage,
  onMoveImage,
  onDeleteImage,
  onEditMobileShape,
  children,
}) {
  const { images } = values;
  const names = imageNames(images);
  const imagesHeadingId = useId();

  function imageItems(image, index) {
    const name = names[index];
    const items = [{ label: "Edit", onClick: () => onEditImage(image) }];
    if (index > 0) {
      items.push({
        label: `Move ${name} up`,
        title: "Move up",
        Icon: GoChevronUp,
        keepOpen: true,
        onClick: () => onMoveImage(index, -1),
      });
    }
    if (index < images.length - 1) {
      items.push({
        label: `Move ${name} down`,
        title: "Move down",
        Icon: GoChevronDown,
        keepOpen: true,
        onClick: () => onMoveImage(index, 1),
      });
    }
    // The only image can't go: every gallery needs one.
    if (images.length > 1) {
      items.push({ label: "Delete", onClick: () => onDeleteImage(image) });
    }
    return items;
  }

  return (
    <section aria-label="Gallery contents" className={styles.toolbar}>
      <ul className={styles.rows}>
        <ToolbarRow
          label={GALLERY_FIELDS.galleryName.label}
          menuLabel={`Actions for ${GALLERY_FIELDS.galleryName.name}`}
          items={[{ label: "Edit", onClick: () => onEditField("galleryName") }]}
          error={fieldErrors.galleryName}
        >
          {values.galleryName.trim()}
        </ToolbarRow>
        {OPTIONAL_GALLERY_FIELDS.map((field) => {
          const { label, name, empty } = GALLERY_FIELDS[field];
          const isEmpty = isBlank(values[field]);
          const items = isEmpty
            ? [{ label: "Add", onClick: () => onEditField(field) }]
            : [
                { label: "Edit", onClick: () => onEditField(field) },
                { label: "Delete", onClick: () => onDeleteField(field) },
              ];
          return (
            <ToolbarRow
              key={field}
              // While empty, the row's own words ("No header") already name the field.
              label={isEmpty ? undefined : label}
              menuLabel={`Actions for ${name}`}
              items={items}
              error={fieldErrors[field]}
            >
              {isEmpty ? empty : values[field].trim()}
            </ToolbarRow>
          );
        })}
      </ul>

      {/* Separates the images from the gallery's own fields above them. */}
      <h3 id={imagesHeadingId} className={styles.separator}>
        Images
      </h3>
      {fieldErrors.images && <p className="fieldError">{fieldErrors.images}</p>}
      {/* What the gallery's crops still lack, which holds Submit back. */}
      {cropIssues.messages.map((message) => (
        <p key={message} className="fieldError">
          {message}
        </p>
      ))}
      {/* With the Mobile Shape row under it, no gap: that row reads as the list's last. */}
      <ul
        aria-labelledby={imagesHeadingId}
        className={`${styles.rows} ${mobileShape ? styles.joinedRows : ""}`}
      >
        {images.map((image, index) => (
          <ToolbarRow
            key={image.key}
            menuLabel={`Actions for ${names[index]}`}
            items={imageItems(image, index)}
            error={[
              cropIssues.rows[image.key],
              ...Object.values(
                serverErrorsFor(fieldErrors, `images.${index}.`),
              ),
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <MdImage aria-hidden="true" className={styles.rowIcon} />
            {image.altText.trim()}
          </ToolbarRow>
        ))}
      </ul>

      {/* The gallery's mobile shape, under every image, since it applies to all of them. */}
      {mobileShape && (
        <ul className={styles.rows}>
          <ToolbarRow
            label="Mobile Shape"
            menuLabel="Actions for mobile shape"
            items={[{ label: "Edit", onClick: onEditMobileShape }]}
          >
            {mobileShape.label}
          </ToolbarRow>
        </ul>
      )}

      {/* The Published switch (Create) and Submit, owned by GalleryForm. */}
      <div className={styles.footer}>{children}</div>
    </section>
  );
}
