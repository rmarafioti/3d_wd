// The post's own fields as Create / Edit Post shows them (docs/flows.md → Create a Post), shared
// by PostForm (each field's input, in its step and in its own dialog) and PostToolbar (each
// field's row), so a field reads the same everywhere: label, its name in sentences ("Edit sub
// header", "Actions for sub header"), its limit, its help text, and its toolbar row while empty.
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
