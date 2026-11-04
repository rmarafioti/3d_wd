// PostToolbar (site owner): the review view's list of the post's fields and body elements, each row
// with a ⋮ menu; it holds no post state, calling back to PostForm.

"use client";

import { useId } from "react";
import { GoChevronDown, GoChevronUp } from "react-icons/go";
import { MdImage, MdNotes } from "react-icons/md";
import ToolbarRow from "./ToolbarRow";
import { serverErrorsFor } from "./ImageField";
import { parseParagraph } from "../_lib/postFormatting";
import { isBlank } from "../_lib/validation";
import { elementNames, OPTIONAL_FIELDS, POST_FIELDS } from "../_lib/postFields";

import styles from "../_styling/postToolbar.module.css";

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

export default function PostToolbar({
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
          const isEmpty = isBlank(values[field]);
          const items = isEmpty
            ? [{ label: "Add", onClick: () => onEditField(field) }]
            : [
                { label: "Edit", onClick: () => onEditField(field) },
                { label: "Delete", onClick: () => onDeleteField(field) },
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
              {isEmpty ? empty : values[field].trim()}
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
              <MdImage aria-hidden="true" className={styles.rowIcon} />
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
