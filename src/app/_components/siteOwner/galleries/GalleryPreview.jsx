// GalleryPreview (site owner): the gallery as it will read on the client website, drawn from the
// Create / Edit a Gallery form's unsaved values.

import Image from "next/image";
import { isBlank } from "../../../_lib/validation";

import styles from "../../../_styling/postPreview.module.css";
import galleryStyles from "../../../_styling/galleryForm.module.css";

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
        {/* Every image is complete, since it only joins through its dialog's Insert. Each shows
            whole: where the website uses the crops is up to the website. */}
        {images.map((image) => (
          <figure key={image.key} className={galleryStyles.previewFigure}>
            {/* Unoptimized, so an object URL needs no host list, as in PostPreview. */}
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
