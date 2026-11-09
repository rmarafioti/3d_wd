// CropDialog: the crop tool (react-easy-crop) for one gallery image's thumbnail or mobile crop,
// opened from GalleryCropField.

"use client";

import { useId, useState } from "react";
import Cropper from "react-easy-crop";
import PostStepDialog from "../contentForm/PostStepDialog";
import MobileShapePicker from "./MobileShapePicker";
import {
  MOBILE_SHAPES,
  THUMBNAIL_ASPECT,
  scaleCrop,
  shapeOf,
} from "../../../_lib/crops";

import styles from "../../../_styling/galleryForm.module.css";

export default function CropDialog({
  kind,
  image,
  initialCrop,
  galleryShape,
  onSave,
  onCancel,
}) {
  const isThumbnail = kind === "thumbnail";
  const zoomId = useId();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // The gallery's shape once set; otherwise the saved crop's, so re-opening it keeps its shape,
  // or 4:5 for a first crop.
  const [shape, setShape] = useState(
    () =>
      galleryShape ?? (initialCrop ? shapeOf(initialCrop) : MOBILE_SHAPES[0]),
  );
  // The crop in natural pixels, reported by the cropper once the image has loaded and after every
  // drag or zoom. Those are image.width × image.height (a picked file's own size, or a stored
  // image's stored size), so Save tidies it with scaleCrop at that same size, and GalleryForm
  // scales a picked file's crops to the stored size once Submit has uploaded it.
  const [areaPixels, setAreaPixels] = useState(null);

  const aspect = isThumbnail ? THUMBNAIL_ASPECT : shape.aspect;
  const size = { width: image.width, height: image.height };

  return (
    <PostStepDialog
      title={isThumbnail ? "Crop thumbnail" : "Crop for mobile"}
      note={
        isThumbnail
          ? "Drag and zoom to choose the square your website shows as this image's thumbnail."
          : "Drag and zoom to choose the part of this image your website shows on phones."
      }
      className={styles.cropDialog}
      primaryLabel="Save"
      primaryDisabled={!areaPixels}
      onPrimary={() => onSave(scaleCrop(areaPixels, size, size, kind))}
      onCancel={onCancel}
    >
      {/* Only the gallery's first mobile crop picks a shape; after that it is changed for every
          image at once, from the toolbar's Mobile Shape row. */}
      {!isThumbnail && !galleryShape && (
        <MobileShapePicker value={shape} onChange={setShape} />
      )}
      {/* The cropper fills this box, which must be positioned and sized. */}
      <div className={styles.cropArea}>
        <Cropper
          image={image.src}
          crop={position}
          zoom={zoom}
          aspect={aspect}
          initialCroppedAreaPixels={initialCrop ?? undefined}
          onCropChange={setPosition}
          onZoomChange={setZoom}
          onCropComplete={(_area, pixels) => setAreaPixels(pixels)}
        />
      </div>
      <label htmlFor={zoomId}>Zoom</label>
      <input
        id={zoomId}
        type="range"
        min={1}
        max={3}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className={styles.zoom}
      />
    </PostStepDialog>
  );
}
