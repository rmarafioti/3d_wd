// GalleryPreview (site owner): the gallery as it will read on the client website, drawn live from
// Create / Edit a Gallery's current, unsaved values, in the review view beside the GalleryToolbar:
// the title, the copy (with its line breaks), then the images in order, each with its caption
// under it, side by side and wrapping onto as many rows as they need.
// Every image is complete, since it only joins the gallery through its dialog's Insert. A picked
// image shows from memory (its object URL) before it is uploaded. Images show whole: how the
// website lays them out, and where it uses the crops, is up to the website. Next.js <Image> at
// their size, unoptimized, as in PostPreview.

import Image from "next/image";
import { isBlank } from "../_lib/validation";

import styles from "../_styling/postPreview.module.css";
import galleryStyles from "../_styling/galleryForm.module.css";

export default function GalleryPreview({ title, copy, images }) {
  return (
    <section aria-label="Gallery preview" className={styles.preview}>
      {!isBlank(title) && <h3>{title.trim()}</h3>}
      {/* pre-line keeps the line breaks the site owner typed (docs/api.md → Validation rules). */}
      {!isBlank(copy) && (
        <p style={{ whiteSpace: "pre-line" }}>{copy.trim()}</p>
      )}
      {/* As many images to a row as the preview's width allows, wrapping onto the next row. */}
      <div className={galleryStyles.previewImages}>
        {images.map((image) => (
          <figure key={image.key} className={galleryStyles.previewFigure}>
            <Image
              src={image.src}
              width={image.width}
              height={image.height}
              alt={image.altText.trim()}
              unoptimized
            />
            {!isBlank(image.caption) && (
              <figcaption>{image.caption.trim()}</figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
