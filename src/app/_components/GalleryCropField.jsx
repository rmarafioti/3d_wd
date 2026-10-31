// GalleryCropField (site owner): the Crops section of a gallery image's Add / Edit dialog
// (docs/flows.md → Gallery image dialog): a row for the square thumbnail crop and one for the
// mobile crop, each optional. A row says what its crop is for, shows the crop (CropPreview) once
// there is one, and has a button to crop (or edit the crop) in CropDialog, and Remove crop.
// Nothing can be cropped until an image is picked. rules (cropRules) are what the gallery's other
// images ask of this one: a crop any of them has is marked required here, and a mobile crop is
// cropped in their shape (GalleryForm holds Insert until both are met). Holds only which crop
// dialog is open: each crop goes back to GalleryForm's working copy through onPatch, so the
// image's Cancel still drops it.

"use client";

import { useState } from "react";
import CropPreview from "./CropPreview";
import CropDialog from "./CropDialog";
import { isBlank } from "../_lib/validation";
import { DIFFERENT_SHAPE, imageCropIssues } from "../_lib/crops";

import styles from "../_styling/galleryForm.module.css";

const REQUIRED_NOTE = "Required, since your other images have one.";

const CROPS = [
  {
    kind: "thumbnail",
    field: "thumbnailCrop",
    label: "Thumbnail",
    note: "A square version for your gallery's grid. Clicking it opens the full image.",
    action: "Crop thumbnail",
    isRequired: (rules) => rules.thumbnailRequired,
  },
  {
    kind: "mobile",
    field: "mobileCrop",
    label: "Mobile",
    note: "A taller version shown on phones, so the image fills more of the screen.",
    action: "Crop for mobile",
    isRequired: (rules) => rules.mobileRequired,
  },
];

// image: the dialog's working copy; rules: cropRules for it; serverErrors: its backend messages by
// path within the image ({ thumbnailCrop: "…", "mobileCrop.x": "…" }).
export default function GalleryCropField({
  image,
  rules,
  onPatch,
  serverErrors,
}) {
  // The CROPS entry whose dialog is open, or null.
  const [cropping, setCropping] = useState(null);
  const hasImage = !isBlank(image.src);

  // A mobile crop of another shape than the other images' (only from a gallery saved before the
  // rule, since a later mobile crop is cropped in their shape), then the backend's message for the crop
  // or one of its numbers (thumbnailCrop.x…).
  function errorFor(field) {
    if (
      field === "mobileCrop" &&
      imageCropIssues(image, rules).includes(DIFFERENT_SHAPE)
    )
      return DIFFERENT_SHAPE;
    const entry = Object.entries(serverErrors).find(
      ([path]) => path === field || path.startsWith(`${field}.`),
    );
    return entry?.[1];
  }

  return (
    <section className={styles.crops}>
      <p className={styles.cropsHeader}>
        Crops <i className={styles.optional}>*Optional</i>
      </p>
      {CROPS.map((option) => {
        const { kind, field, label, note, action, isRequired } = option;
        const crop = image[field];
        const error = errorFor(field);
        return (
          <div key={kind} className={styles.cropRow}>
            <p className={styles.cropLabel}>{label}</p>
            <p className={styles.cropNote}>
              <i>*{note}</i>
            </p>
            {isRequired(rules) && (
              <p className={styles.cropNote}>
                <i>*{REQUIRED_NOTE}</i>
              </p>
            )}
            {crop && hasImage && (
              <CropPreview
                src={image.src}
                width={image.width}
                height={image.height}
                crop={crop}
                alt={`${label} crop`}
              />
            )}
            <div className={styles.cropButtons}>
              <button
                type="button"
                disabled={!hasImage}
                aria-label={crop ? `Edit ${label.toLowerCase()} crop` : action}
                onClick={() => setCropping(option)}
              >
                {crop ? "Edit crop" : action}
              </button>
              {crop && (
                <button
                  type="button"
                  aria-label={`Remove ${label.toLowerCase()} crop`}
                  onClick={() => onPatch({ [field]: null })}
                >
                  Remove crop
                </button>
              )}
            </div>
            {error && <p className="fieldError">{error}</p>}
          </div>
        );
      })}
      {cropping && (
        <CropDialog
          kind={cropping.kind}
          image={image}
          initialCrop={image[cropping.field]}
          galleryShape={rules.mobileShape}
          onSave={(crop) => {
            onPatch({ [cropping.field]: crop });
            setCropping(null);
          }}
          onCancel={() => setCropping(null)}
        />
      )}
    </section>
  );
}
