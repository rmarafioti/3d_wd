// PostPreview (site owner): the post as it will read on the client website, drawn live from
// Create / Edit Post's unsaved values in the review view.

import Image from "next/image";
import FormattedText from "./FormattedText";
import { isBlank } from "../_lib/validation";

import styles from "../_styling/postPreview.module.css";

export default function PostPreview({ header, subHeader, postDate, body }) {
  return (
    <section aria-label="Post preview" className={styles.preview}>
      {/* The date first, so a reader sees how recent the post is before anything else. */}
      {!isBlank(postDate) && <p>{postDate}</p>}
      {!isBlank(header) && <h3>{header.trim()}</h3>}
      {!isBlank(subHeader) && <p>{subHeader.trim()}</p>}
      {body.map((element) =>
        element.type === "paragraph" ? (
          // pre-line keeps the line breaks the site owner typed (docs/api.md → Shapes).
          <p key={element.key} style={{ whiteSpace: "pre-line" }}>
            <FormattedText text={element.text.trim()} />
          </p>
        ) : (
          // Unoptimized, so neither a picked file's object URL nor a Cloudinary URL needs a
          // next.config host list.
          <Image
            key={element.key}
            src={element.src}
            width={element.width}
            height={element.height}
            alt={element.altText.trim()}
            unoptimized
          />
        ),
      )}
    </section>
  );
}
