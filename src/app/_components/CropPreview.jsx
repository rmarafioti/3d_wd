// CropPreview (site owner): a small picture of one gallery image crop, the part of the image a
// thumbnail or a phone will show (docs/flows.md → Gallery image dialog). It draws from the full
// image, with no extra request: a box in the crop's proportions shows the image scaled and moved
// so only the crop is in view. crop is in the pixels of an image sized width × height, the picked
// file's size or the stored size, whichever src is.
// The image's size and position are computed from the crop, so they are inline styles: no class
// can hold them (the same reason as pre-line on post paragraphs). max-width is inline too: a page's
// own image rule (the gallery page's .postImage img { max-width: 50% }) has the same specificity
// as a module class, so which one won depended on stylesheet order, and the scaled image was
// squeezed to half the box. Inline always wins.

import Image from "next/image";

import styles from "../_styling/galleryForm.module.css";

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
