// CropDialog (site owner): the crop tool for one gallery image (docs/flows.md → Gallery image
// dialog), opened from GalleryCropField on top of the image's dialog. kind "thumbnail" crops a
// square; kind "mobile" crops in the gallery's mobile shape, one of MOBILE_SHAPES. The gallery's
// first mobile crop sets it, with the Shape choices (MobileShapePicker, 4:5 by default) above the
// frame, each previewing live on the photo. Once another image has a mobile crop, galleryShape is
// their shape and no choices show: the shape is changed for every image from the toolbar's Mobile
// Shape row (Rich, 2026-10-31). The site owner drags the image under the frame and zooms with the wheel, a pinch or
// the Zoom slider (react-easy-crop). Re-opening a crop starts from it.
//
// react-easy-crop reports the crop in the shown image's natural pixels, which are image.width ×
// image.height: a picked file's own size, or a stored image's stored size. Save tidies it with
// scaleCrop at that same size (whole pixels, inside the image, square or portrait), and
// GalleryForm scales a picked file's crops to the stored size once Submit has uploaded it.

"use client";

import { useId, useState } from "react";
import Cropper from "react-easy-crop";
import PostStepDialog from "./PostStepDialog";
import MobileShapePicker from "./MobileShapePicker";
import {
  MOBILE_SHAPES,
  THUMBNAIL_ASPECT,
  scaleCrop,
  shapeOf,
} from "../_lib/crops";

import styles from "../_styling/galleryForm.module.css";

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
  // drag or zoom.
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
