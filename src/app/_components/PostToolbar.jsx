// PostToolbar (site owner): the list beside the preview in Create / Edit Post's review view, one
// row for every part of the post, each with a ⋮ menu (ActionsMenu), then its children: PostForm's
// Published switch (Create only) and Submit (docs/flows.md → Create a Post). The post's own fields
// and its body are two lists, with a "Body" heading between them so the two read apart.
// - Post name: Edit.
// - Date, header and sub header: Edit and Delete, or only Add while empty.
// - Each body element, in order, shown by its icon and its first words (a paragraph) or its alt
//   text (an image): Edit, a Move up and a Move down arrow where it can move that way (they keep
//   the menu open, so it can move several places), and Delete, except on the only paragraph.
// Holds no post state: every action is a callback to PostForm. A backend field message shows under
// the row it belongs to.

"use client";

import { useId } from "react";
import { GoChevronDown, GoChevronUp } from "react-icons/go";
import { MdImage, MdNotes } from "react-icons/md";
import ActionsMenu from "./ActionsMenu";
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

function Row({ menuLabel, items, error, children }) {
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowLabel}>{children}</span>
        <ActionsMenu
          label={menuLabel}
          items={items}
          className={styles.menuCell}
          listClassName={styles.menuList}
        />
      </div>
      {error && <p className="fieldError">{error}</p>}
    </li>
  );
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
        <Row
          menuLabel={`Actions for ${POST_FIELDS.postName.name}`}
          items={[{ label: "Edit", onClick: () => onEditField("postName") }]}
          error={fieldErrors.postName}
        >
          {values.postName.trim()}
        </Row>
        {OPTIONAL_FIELDS.map((field) => {
          const { name, empty } = POST_FIELDS[field];
          const isEmpty = isBlank(values[field]);
          const items = isEmpty
            ? [{ label: "Add", onClick: () => onEditField(field) }]
            : [
                { label: "Edit", onClick: () => onEditField(field) },
                { label: "Delete", onClick: () => onDeleteField(field) },
              ];
          return (
            <Row
              key={field}
              menuLabel={`Actions for ${name}`}
              items={items}
              error={fieldErrors[field]}
            >
              {isEmpty ? empty : values[field].trim()}
            </Row>
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
          <Row
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
          </Row>
        ))}
      </ul>

      {/* The Published switch (Create) and Submit, owned by PostForm. */}
      <div className={styles.footer}>{children}</div>
    </section>
  );
}
