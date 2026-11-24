// PostToolbar (site owner): the review view's rows for the post's fields and body elements, each with
// a ⋮ menu (none on a saved post's web address); it holds no post state, calling back to PostForm.

"use client";

import { useId } from "react";
import Image from "next/image";
import { GoChevronDown, GoChevronUp } from "react-icons/go";
import { MdNotes } from "react-icons/md";
import ToolbarRow from "../contentForm/ToolbarRow";
import { serverErrorsFor } from "../contentForm/ImageField";
import { parseParagraph } from "../../../_lib/postFormatting";
import { isBlank } from "../../../_lib/validation";
import { toPostSlug } from "../../../_lib/postSlug";
import {
  elementNames,
  OPTIONAL_FIELDS,
  POST_FIELDS,
  SLUG_READ_ONLY_NOTE,
} from "../../../_lib/postFields";

import styles from "../../../_styling/postToolbar.module.css";

// A paragraph's words without their markup, for its row: link text stays, markers go.
function plainText(segments) {
  return segments
    .map((segment) =>
      segment.type === "text" || segment.type === "link"
        ? segment.text
        : plainText(segment.children),
    )
    .join("");
}

// What one of the post's own fields shows in its row ("" while empty). The web address reads as it
// will be saved: the site owner's own, or the one the backend will make from the header.
export function shownFieldValue(field, values) {
  if (field === "slug") {
    return toPostSlug(values.slug) ?? toPostSlug(values.header) ?? "";
  }
  return values[field].trim();
}

export default function PostToolbar({
  isCreate,
  values,
  fieldErrors,
  onEditField,
  onDeleteField,
  onEditElement,
  onMoveElement,
  onDeleteElement,
  children,
}) {
  const { body } = values;
  const paragraphCount = body.filter(
    (element) => element.type === "paragraph",
  ).length;

  const names = elementNames(body);
  const bodyHeadingId = useId();

  function elementItems(element, index) {
    const name = names[index];
    const items = [{ label: "Edit", onClick: () => onEditElement(element) }];
    if (index > 0) {
      items.push({
        label: `Move ${name} up`,
        title: "Move up",
        Icon: GoChevronUp,
        keepOpen: true,
        onClick: () => onMoveElement(index, -1),
      });
    }
    if (index < body.length - 1) {
      items.push({
        label: `Move ${name} down`,
        title: "Move down",
        Icon: GoChevronDown,
        keepOpen: true,
        onClick: () => onMoveElement(index, 1),
      });
    }
    // The only paragraph can't go: every post needs one.
    if (element.type === "image" || paragraphCount > 1) {
      items.push({ label: "Delete", onClick: () => onDeleteElement(element) });
    }
    return items;
  }

  // An element's backend messages: its text, its type, then its image fields.
  function elementError(index) {
    return [
      fieldErrors[`body.${index}.text`],
      fieldErrors[`body.${index}.type`],
      ...Object.values(serverErrorsFor(fieldErrors, `body.${index}.image.`)),
    ]
      .filter(Boolean)
      .join(" ");
  }

  return (
    <section aria-label="Post contents" className={styles.toolbar}>
      <ul className={styles.rows}>
        <ToolbarRow
          label={POST_FIELDS.postName.label}
          menuLabel={`Actions for ${POST_FIELDS.postName.name}`}
          items={[{ label: "Edit", onClick: () => onEditField("postName") }]}
          error={fieldErrors.postName}
        >
          {values.postName.trim()}
        </ToolbarRow>
        {OPTIONAL_FIELDS.map((field) => {
          const { label, name, empty } = POST_FIELDS[field];
          // A saved post's web address never changes, so Edit shows it with no menu.
          if (field === "slug" && !isCreate) {
            return (
              <ToolbarRow key={field} label={label}>
                {values.slug}{" "}
                <i className={styles.readOnlyNote}>*{SLUG_READ_ONLY_NOTE}</i>
              </ToolbarRow>
            );
          }
          const shown = shownFieldValue(field, values);
          const isEmpty = shown === "";
          // Delete empties what the site owner entered; a web address made from the header has
          // nothing of theirs to delete.
          const canDelete = !isBlank(values[field]);
          const items = isEmpty
            ? [{ label: "Add", onClick: () => onEditField(field) }]
            : [
                { label: "Edit", onClick: () => onEditField(field) },
                ...(canDelete
                  ? [{ label: "Delete", onClick: () => onDeleteField(field) }]
                  : []),
              ];
          return (
            <ToolbarRow
              key={field}
              // While empty, the row's own words ("No header") already name the field.
              label={isEmpty ? undefined : label}
              menuLabel={`Actions for ${name}`}
              items={items}
              error={fieldErrors[field]}
            >
              {isEmpty ? empty : shown}
            </ToolbarRow>
          );
        })}
      </ul>

      {/* Separates the body from the post's own fields above it. */}
      <h3 id={bodyHeadingId} className={styles.separator}>
        Body
      </h3>
      {fieldErrors.body && <p className="fieldError">{fieldErrors.body}</p>}
      <ul aria-labelledby={bodyHeadingId} className={styles.rows}>
        {body.map((element, index) => (
          <ToolbarRow
            key={element.key}
            menuLabel={`Actions for ${names[index]}`}
            items={elementItems(element, index)}
            error={elementError(index)}
          >
            {element.type === "paragraph" ? (
              <MdNotes aria-hidden="true" className={styles.rowIcon} />
            ) : (
              // The photo itself, so it is told apart at a glance; alt="" since its alt text follows.
              <Image
                src={element.src}
                width={element.width}
                height={element.height}
                alt=""
                unoptimized
                className={styles.rowThumbnail}
              />
            )}
            {element.type === "paragraph"
              ? plainText(parseParagraph(element.text.trim()))
              : element.altText.trim()}
          </ToolbarRow>
        ))}
      </ul>

      {/* The Published switch (Create) and Submit, owned by PostForm. */}
      <div className={styles.footer}>{children}</div>
    </section>
  );
}
