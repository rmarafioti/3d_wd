// PostPreview (site owner): the post as it will read on the client website, drawn live from the
// Create / Edit Post form's current, unsaved values: the date first (so a reader sees how recent
// the post is before anything else), then the header, sub header and the body in order.
// Paragraphs keep their line breaks and formatting (FormattedText, the same renderer as the post
// page); an image shows once its fields are complete. A picked image shows from memory (its object
// URL) before it is uploaded. The client website's own styling isn't applied (Post preview v1).
// Images use Next.js <Image> at their size, unoptimized, so neither an object URL nor a Cloudinary
// URL needs a next.config host list.

import Image from "next/image";
import FormattedText from "./FormattedText";
import { isBlank, validateImage } from "../_lib/validation";

import styles from "../_styling/postPreview.module.css";

// A paragraph shows once it has text; an image once its fields are complete.
function isShown(element) {
  if (element.type === "paragraph") return !isBlank(element.text);
  return Object.keys(validateImage(element)).length === 0;
}

export default function PostPreview({ header, subHeader, postDate, body }) {
  const shown = body.filter(isShown);
  const isEmpty =
    isBlank(header) &&
    isBlank(subHeader) &&
    isBlank(postDate) &&
    shown.length === 0;

  return (
    <section aria-label="Post preview" className={styles.preview}>
      {isEmpty && <p>Your post will show here as you type.</p>}
      {!isBlank(postDate) && <p>{postDate}</p>}
      {!isBlank(header) && <h3>{header.trim()}</h3>}
      {!isBlank(subHeader) && <p>{subHeader.trim()}</p>}
      {shown.map((element) =>
        element.type === "paragraph" ? (
          // pre-line keeps the line breaks the site owner typed (docs/api.md → Shapes).
          <p key={element.key} style={{ whiteSpace: "pre-line" }}>
            <FormattedText text={element.text.trim()} />
          </p>
        ) : (
          <Image
            key={element.key}
            src={element.src.trim()}
            width={Number(element.width)}
            height={Number(element.height)}
            alt={element.altText.trim()}
            unoptimized
          />
        ),
      )}
    </section>
  );
}
