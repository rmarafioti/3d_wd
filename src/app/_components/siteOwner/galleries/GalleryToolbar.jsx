// GalleryToolbar (site owner): the review view's list of the gallery's fields, images and mobile
// shape, each row with a ⋮ menu; it holds no gallery state, calling back to GalleryForm.

"use client";

import { useId } from "react";
import Image from "next/image";
import { GoChevronDown, GoChevronUp } from "react-icons/go";
import ToolbarRow from "../contentForm/ToolbarRow";
import { serverErrorsFor } from "../contentForm/ImageField";
import { isBlank } from "../../../_lib/validation";
import {
  GALLERY_FIELDS,
  imageNames,
  OPTIONAL_GALLERY_FIELDS,
} from "../../../_lib/galleryFields";

import styles from "../../../_styling/postToolbar.module.css";

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
              // While empty, the row's own words ("No title") already name the field.
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
            {/* The photo itself, so it is told apart at a glance; alt="" since its alt text follows. */}
            <Image
              src={image.src}
              width={image.width}
              height={image.height}
              alt=""
              unoptimized
              className={styles.rowThumbnail}
            />
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
