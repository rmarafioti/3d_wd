// CropPreview (site owner): a small picture of one gallery image's crop, drawn from the full image
// in a box of the crop's proportions. crop is in the pixels of an image sized width × height.

import Image from "next/image";

import styles from "../../../_styling/galleryForm.module.css";

export default function CropPreview({ src, width, height, crop, alt }) {
  return (
    <div
      className={styles.cropPreview}
      style={{ aspectRatio: `${crop.width} / ${crop.height}` }}
    >
      <Image
        src={src}
        width={width}
        height={height}
        alt={alt}
        unoptimized
        // Computed from the crop, so no class can hold them. max-width is inline too: a page's own
        // image rule (the gallery page's .postImage img) has a module class's specificity, so
        // stylesheet order could squeeze the scaled image to half the box. Inline always wins.
        style={{
          maxWidth: "none",
          width: `${(width / crop.width) * 100}%`,
          height: `${(height / crop.height) * 100}%`,
          left: `${(-crop.x / crop.width) * 100}%`,
          top: `${(-crop.y / crop.height) * 100}%`,
        }}
      />
    </div>
  );
}
