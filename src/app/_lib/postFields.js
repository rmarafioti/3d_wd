// postFields: the post's own fields as Create / Edit Post shows them, shared by PostForm and
// PostToolbar so a field reads the same in its dialog and its toolbar row, and two shared texts.

// The publish date's note, the same in the post form and on the post page.
export const POST_PUBLISH_DATE_NOTE =
  "Your post is listed by the day it was created, so you may want to set its Post Date to the publish day.";

// Delete a Post's confirmation, the same on the post page and the dashboard's ⋮ menu.
export function deletePostMessage(postName) {
  return `Delete ${postName}? It will be removed from your dashboard and your website. You can restore it from Recently Deleted for 30 days.`;
}

// The limits match docs/api.md → Validation rules (checked in validation.js's validatePost).
export const POST_FIELDS = {
  postName: {
    label: "Post Name",
    name: "post name",
    type: "text",
    max: 100,
    note: "Only you see this, it's how you find the post on your dashboard.",
  },
  postDate: {
    label: "Post Date",
    name: "date",
    type: "date",
    note: "Shown on your website so visitors know how recent the post is.",
    empty: "No date",
  },
  header: {
    label: "Header",
    name: "header",
    type: "text",
    max: 150,
    empty: "No header",
  },
  subHeader: {
    label: "Sub Header",
    name: "sub header",
    type: "text",
    max: 200,
    empty: "No sub header",
  },
};

// The optional fields, in the order they show on the post.
export const OPTIONAL_FIELDS = ["postDate", "header", "subHeader"];

// Each body element's name for screen readers, counted within its type ("paragraph 2",
// "image 1"), so its buttons and menu can be told apart.
export function elementNames(body) {
  const typeCounts = { paragraph: 0, image: 0 };
  return body.map((element) => `${element.type} ${++typeCounts[element.type]}`);
}
