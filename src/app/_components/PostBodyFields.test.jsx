// Tests for PostBodyFields (docs/flows.md → PostBodyFields): adding paragraphs and images in
// order and the Add buttons' labels, the one-paragraph rule, the "complete it before adding
// another" rule and its notes, Move up / Move down / Delete, the 5-paragraph and 5-image limits
// shown as text, width/height auto-fill (including a late load for an old URL), server messages
// on the right element, and onReindex on every add, move and delete.

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostBodyFields from "./PostBodyFields";

// The Add buttons read "Add a / an …" with none of that type and "Add another …" once there is
// one; the exact label has its own test below.
const ADD_PARAGRAPH = /^Add (a|another) paragraph$/;
const ADD_IMAGE = /^Add (an|another) image$/;

const PARAGRAPH = { key: "p1", type: "paragraph", text: "First." };
const SECOND = { key: "p2", type: "paragraph", text: "Second." };
const IMAGE = {
  key: "i1",
  type: "image",
  src: "https://res.cloudinary.com/demo/one.jpg",
  width: "800",
  height: "600",
  altText: "Stevie",
};

// PostBodyFields is controlled; this owns the array the way PostForm does.
function Harness({ initialBody = [PARAGRAPH], fieldErrors = {}, onReindex }) {
  const [body, setBody] = useState(initialBody);
  return (
    <PostBodyFields
      body={body}
      setBody={setBody}
      fieldErrors={fieldErrors}
      onReindex={onReindex}
    />
  );
}

function setup(props = {}) {
  const onReindex = vi.fn();
  const user = userEvent.setup();
  render(<Harness onReindex={onReindex} {...props} />);
  return { user, onReindex };
}

// Stands in for the browser's Image so a test decides when (and whether) an image "loads".
function stubImageLoading() {
  const loads = [];
  class FakeImage {
    set src(value) {
      loads.push({
        src: value,
        load: (width, height) => {
          this.naturalWidth = width;
          this.naturalHeight = height;
          this.onload();
        },
      });
    }
  }
  vi.stubGlobal("Image", FakeImage);
  return loads;
}

function many(element, count) {
  return Array.from({ length: count }, (_, i) => ({
    ...element,
    key: `${element.key}-${i}`,
  }));
}

// The body as the site owner sees it, top to bottom: each paragraph's text or image's URL.
function bodyOrder() {
  return screen
    .getAllByLabelText(/^(Paragraph|Image URL)$/)
    .map((input) => input.value);
}

describe("PostBodyFields", () => {
  it('labels the Add buttons "Add a / an …" with none of that type and "Add another …" once there is one', async () => {
    const { user } = setup();

    expect(
      screen.getByRole("button", { name: "Add another paragraph" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add an image" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add an image" }));

    expect(
      screen.getByRole("button", { name: "Add another image" }),
    ).toBeInTheDocument();
  });

  it("appends paragraphs and images in the order they are added, and reindexes", async () => {
    const { user, onReindex } = setup();

    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await user.type(screen.getByLabelText("Image URL"), "https://x.com/a.jpg");
    await user.click(screen.getByRole("button", { name: ADD_PARAGRAPH }));
    await user.type(screen.getAllByLabelText("Paragraph")[1], "Last.");

    expect(bodyOrder()).toEqual(["First.", "https://x.com/a.jpg", "Last."]);
    expect(onReindex).toHaveBeenCalledTimes(2);
  });

  it('offers only "Add a paragraph", with the required message above it, once every paragraph is deleted', async () => {
    const { user } = setup({ initialBody: [PARAGRAPH, IMAGE] });

    await user.click(
      screen.getByRole("button", { name: "Delete paragraph 1" }),
    );

    const addParagraph = screen.getByRole("button", {
      name: "Add a paragraph",
    });
    const note = screen.getByText(
      "One paragraph is required to submit a post.",
    );
    expect(addParagraph).toBeEnabled();
    expect(note.compareDocumentPosition(addParagraph)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      screen.queryByRole("button", { name: ADD_IMAGE }),
    ).not.toBeInTheDocument();
  });

  it("names each element's buttons by its type and position for screen readers", () => {
    setup({ initialBody: [PARAGRAPH, IMAGE, SECOND] });

    expect(
      screen.getByRole("button", { name: "Move paragraph 2 up" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Move image 1 down" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete paragraph 1" }),
    ).toBeInTheDocument();
  });

  it("disables Move up on the first element and Move down on the last", () => {
    setup({ initialBody: [PARAGRAPH, IMAGE, SECOND] });

    expect(
      screen.getByRole("button", { name: "Move paragraph 1 up" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move paragraph 2 down" }),
    ).toBeDisabled();
  });

  it("swaps an element with the one above on Move up, and reindexes", async () => {
    const { user, onReindex } = setup({
      initialBody: [PARAGRAPH, IMAGE, SECOND],
    });

    await user.click(screen.getByRole("button", { name: "Move image 1 up" }));

    expect(bodyOrder()).toEqual([IMAGE.src, "First.", "Second."]);
    expect(onReindex).toHaveBeenCalledOnce();
  });

  it("swaps an element with the one below on Move down, and reindexes", async () => {
    const { user, onReindex } = setup({
      initialBody: [PARAGRAPH, IMAGE, SECOND],
    });

    await user.click(screen.getByRole("button", { name: "Move image 1 down" }));

    expect(bodyOrder()).toEqual(["First.", "Second.", IMAGE.src]);
    expect(onReindex).toHaveBeenCalledOnce();
  });

  it("removes an element with Delete and reindexes", async () => {
    const { user, onReindex } = setup({ initialBody: [PARAGRAPH, IMAGE] });

    await user.click(screen.getByRole("button", { name: "Delete image 1" }));

    expect(screen.queryByLabelText("Image URL")).not.toBeInTheDocument();
    expect(onReindex).toHaveBeenCalledOnce();
  });

  it("hides both Add buttons, with the required message under that paragraph's buttons, while the only paragraph is blank", () => {
    setup({ initialBody: [{ ...PARAGRAPH, text: "" }] });

    const note = screen.getByText(
      "One paragraph is required to submit a post.",
    );
    expect(
      screen
        .getByRole("button", { name: "Delete paragraph 1" })
        .compareDocumentPosition(note),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen.queryByText("Complete or delete paragraph to submit."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: ADD_IMAGE }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: ADD_PARAGRAPH }),
    ).not.toBeInTheDocument();
  });

  it("shows both Add buttons, enabled, once the paragraph has text", async () => {
    const { user } = setup({ initialBody: [{ ...PARAGRAPH, text: "" }] });

    await user.type(screen.getByLabelText("Paragraph"), "Hi");

    expect(
      screen.queryByText("One paragraph is required to submit a post."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: ADD_IMAGE })).toBeEnabled();
    expect(screen.getByRole("button", { name: ADD_PARAGRAPH })).toBeEnabled();
  });

  it("disables Add image, with a note under that image's buttons, while an image is incomplete", () => {
    setup({ initialBody: [PARAGRAPH, { ...IMAGE, altText: "" }] });

    const note = screen.getByText("Complete or delete image to submit.");
    expect(
      screen
        .getByRole("button", { name: "Delete image 1" })
        .compareDocumentPosition(note),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      note.compareDocumentPosition(
        screen.getByRole("button", { name: ADD_PARAGRAPH }),
      ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByRole("button", { name: ADD_IMAGE })).toBeDisabled();
    expect(screen.getByRole("button", { name: ADD_PARAGRAPH })).toBeEnabled();
  });

  it("disables Add paragraph, with a note under that paragraph's buttons, while a second paragraph is blank", () => {
    setup({ initialBody: [PARAGRAPH, { ...SECOND, text: "" }] });

    const note = screen.getByText("Complete or delete paragraph to submit.");
    expect(
      screen
        .getByRole("button", { name: "Delete paragraph 2" })
        .compareDocumentPosition(note),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByRole("button", { name: ADD_PARAGRAPH })).toBeDisabled();
    expect(screen.getByRole("button", { name: ADD_IMAGE })).toBeEnabled();
  });

  it("keeps the Add labels and shows the limits as text at 5 paragraphs and 5 images", () => {
    setup({ initialBody: [...many(PARAGRAPH, 5), ...many(IMAGE, 5)] });

    expect(screen.getByText("Maximum of 5 paragraphs")).toBeInTheDocument();
    expect(screen.getByText("Maximum of 5 images")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ADD_PARAGRAPH })).toBeDisabled();
    expect(screen.getByRole("button", { name: ADD_IMAGE })).toBeDisabled();
  });

  it("allows adding below the limits", () => {
    setup({ initialBody: [...many(PARAGRAPH, 4), ...many(IMAGE, 4)] });

    expect(screen.getByRole("button", { name: ADD_PARAGRAPH })).toBeEnabled();
    expect(screen.getByRole("button", { name: ADD_IMAGE })).toBeEnabled();
  });

  it("shows a later blank paragraph's message once it has been left", async () => {
    const { user } = setup({
      initialBody: [PARAGRAPH, { ...SECOND, text: "" }],
    });

    await user.click(screen.getAllByLabelText("Paragraph")[1]);
    await user.tab();

    expect(screen.getByText("Paragraph is required.")).toBeInTheDocument();
  });

  it('shows only "One paragraph is required…", not "Paragraph is required.", while no paragraph has text', async () => {
    const { user } = setup({ initialBody: [{ ...PARAGRAPH, text: "" }] });

    await user.click(screen.getByLabelText("Paragraph"));
    await user.tab();

    expect(
      screen.getByText("One paragraph is required to submit a post."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Paragraph is required."),
    ).not.toBeInTheDocument();
  });

  it("fills Width and Height from the image once it loads", async () => {
    const loads = stubImageLoading();
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await user.click(screen.getByLabelText("Image URL"));

    await user.paste("https://res.cloudinary.com/demo/one.jpg");
    loads.at(-1).load(1200, 900);

    expect(await screen.findByDisplayValue("1200")).toBe(
      screen.getByLabelText("Width"),
    );
    expect(screen.getByLabelText("Height")).toHaveValue(900);
  });

  it("ignores a late load for a URL that has since been changed", async () => {
    const loads = stubImageLoading();
    const { user } = setup({
      initialBody: [PARAGRAPH, { ...IMAGE, width: "", height: "" }],
    });
    const urlInput = screen.getByLabelText("Image URL");

    await user.clear(urlInput);
    await user.paste("https://res.cloudinary.com/demo/old.jpg");
    const oldLoad = loads.find(
      (load) => load.src === "https://res.cloudinary.com/demo/old.jpg",
    );
    await user.clear(urlInput);
    await user.paste("https://res.cloudinary.com/demo/new.jpg");
    oldLoad.load(111, 222);

    expect(screen.getByLabelText("Width")).toHaveValue(null);
    loads.at(-1).load(640, 480);
    expect(await screen.findByDisplayValue("640")).toBe(
      screen.getByLabelText("Width"),
    );
  });

  it("shows server messages on the element their path points at", () => {
    const second = { ...PARAGRAPH, key: "p2" };
    setup({
      initialBody: [PARAGRAPH, second, IMAGE],
      fieldErrors: {
        "body.0.type": "Element type must be paragraph or image.",
        "body.1.text": "Paragraph must be 10000 characters or fewer.",
        "body.2.image.altText": "Alt text must be 200 characters or fewer.",
      },
    });

    expect(
      screen.getAllByLabelText("Paragraph")[1].nextElementSibling,
    ).toHaveTextContent("Paragraph must be 10000 characters or fewer.");
    expect(
      screen.getByLabelText("Alt Text").nextElementSibling,
    ).toHaveTextContent("Alt text must be 200 characters or fewer.");
    expect(
      screen.getAllByLabelText("Paragraph")[0].nextElementSibling,
    ).toHaveTextContent("Element type must be paragraph or image.");
  });

  it("shows a list-level server message for the body", () => {
    setup({ fieldErrors: { body: "Add at least one paragraph." } });

    expect(screen.getByText("Add at least one paragraph.")).toBeInTheDocument();
  });
});
