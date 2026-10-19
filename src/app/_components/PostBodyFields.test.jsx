// Tests for PostBodyFields (docs/flows.md → PostBodyFields): adding paragraphs and images in
// order and the Add buttons' labels, the one-paragraph rule, the "complete it before adding
// another" rule and its notes, Move up / Move down / Delete, the 5-paragraph and 5-image limits
// shown as text, width/height auto-fill (including a late load for an old URL), server messages
// on the right element, onReindex on every add, move and delete, and each paragraph's Bold /
// Italic / Link buttons (docs/flows.md → Paragraph formatting).

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostBodyFields from "./PostBodyFields";
import { selectText } from "../../test/helpers";

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

describe("PostBodyFields formatting", () => {
  function setupText(text) {
    const result = setup({ initialBody: [{ ...PARAGRAPH, text }] });
    return { ...result, textarea: screen.getByLabelText("Paragraph") };
  }

  function formatButton(label) {
    return screen.getByRole("button", { name: `${label} text in paragraph 1` });
  }

  it("keeps the buttons disabled for a highlight running over a line break", () => {
    const { textarea } = setupText("one two\nthree");

    selectText(textarea, 4, 12);

    for (const label of ["Bold", "Italic", "Link"]) {
      expect(formatButton(label)).toBeDisabled();
    }
  });

  it("starts bold at the cursor, so what is typed next is bold, and removes it on a second click", async () => {
    const { user, textarea } = setupText("Hi ");
    selectText(textarea, 3, 3);
    await user.click(formatButton("Bold"));
    expect(textarea).toHaveValue("Hi ****");
    expect(formatButton("Bold")).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("bold");
    expect(textarea).toHaveValue("Hi **bold**");

    await user.click(formatButton("Bold"));

    expect(textarea).toHaveValue("Hi bold");
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([7, 7]);
    expect(formatButton("Bold")).toHaveAttribute("aria-pressed", "false");
  });

  it("never presses Italic when a letter is deleted inside bold", () => {
    const { textarea } = setupText("Hi **bo**");
    selectText(textarea, 7, 7);

    // A deletion as the browser reports it: the new text and cursor, before any keyup.
    fireEvent.change(textarea, {
      target: { value: "Hi **b**", selectionStart: 6, selectionEnd: 6 },
    });

    expect(formatButton("Italic")).toHaveAttribute("aria-pressed", "false");
    expect(formatButton("Bold")).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["** **", 3],
    ["* *", 2],
    ["5 * 3 * 2", 5],
  ])(
    "doesn't offer %j as a format when the cursor is inside it",
    (text, caret) => {
      const { textarea } = setupText(text);

      selectText(textarea, caret, caret);

      expect(formatButton("Bold")).toHaveAttribute("aria-pressed", "false");
      expect(formatButton("Italic")).toHaveAttribute("aria-pressed", "false");
      expect(formatButton("Bold")).toBeEnabled();
    },
  );

  it("moves the cursor back into the words, without adding markers, from between the closing *", async () => {
    const { user, textarea } = setupText("Hi **bold**");
    selectText(textarea, 10, 10);
    expect(formatButton("Bold")).toHaveAttribute("aria-pressed", "true");

    await user.click(formatButton("Bold"));

    expect(textarea).toHaveValue("Hi **bold**");
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([9, 9]);
  });

  it("goes back into bold, without adding markers, from just after its closing **", async () => {
    const { user, textarea } = setupText("Hi **bold**");
    selectText(textarea, 11, 11);
    expect(formatButton("Bold")).toHaveAttribute("aria-pressed", "false");

    await user.click(formatButton("Bold"));
    await user.keyboard("er");

    expect(textarea).toHaveValue("Hi **bolder**");
  });

  it("goes into bold from just before its opening ** at the start of the text", async () => {
    const { user, textarea } = setupText("**bold** day");
    selectText(textarea, 0, 0);

    await user.click(formatButton("Bold"));

    expect(textarea).toHaveValue("**bold** day");
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 2]);
  });

  it.each([
    ["just after", 7, 5],
    ["just before", 3, 5],
  ])(
    "moves the cursor into an empty pair from %s it, never adding stars",
    async (_, caret, inside) => {
      const { user, textarea } = setupText("Hi ****");
      selectText(textarea, caret, caret);

      await user.click(formatButton("Bold"));

      expect(textarea).toHaveValue("Hi ****");
      expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([
        inside,
        inside,
      ]);
    },
  );

  it("never adds stars against stars it doesn't read as a format, however often it is pressed", async () => {
    const { user, textarea } = setupText("Hi ** word**");
    selectText(textarea, 12, 12);

    await user.click(formatButton("Bold"));
    await user.click(formatButton("Bold"));
    await user.keyboard("{Control>}b{/Control}");
    await user.click(formatButton("Italic"));

    expect(textarea).toHaveValue("Hi ** word**");
  });

  it("never piles up stars when Bold is pressed again and again just after bold words", async () => {
    const { user, textarea } = setupText("Hi **word**");
    selectText(textarea, 11, 11);
    const starCounts = [];

    for (let press = 0; press < 6; press += 1) {
      await user.click(formatButton("Bold"));
      starCounts.push((textarea.value.match(/\*/g) ?? []).length);
    }

    expect(Math.max(...starCounts)).toBeLessThanOrEqual(4);
  });

  it("starts a new pair once a space is typed after a run", async () => {
    const { user, textarea } = setupText("Hi **bold** ");
    selectText(textarea, 12, 12);

    await user.click(formatButton("Italic"));

    expect(textarea).toHaveValue("Hi **bold** **");
  });

  it("acts at the end of the text before the paragraph has been clicked into", async () => {
    const { user, textarea } = setupText("Hi ");

    await user.click(formatButton("Italic"));

    expect(textarea).toHaveValue("Hi **");
    expect(formatButton("Italic")).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["Bold", "*Hello World*"],
    ["Italic", "**Hello World**"],
  ])(
    "removes %s from bold-italic words with the cursor after their last letter",
    async (label, result) => {
      const { user, textarea } = setupText("***Hello World***");
      selectText(textarea, 14, 14);

      await user.click(formatButton(label));

      expect(textarea).toHaveValue(result);
    },
  );

  it("removes an empty pair of markers on a second click", async () => {
    const { user, textarea } = setupText("Hi ");
    selectText(textarea, 3, 3);
    await user.click(formatButton("Bold"));

    await user.click(formatButton("Bold"));

    expect(textarea).toHaveValue("Hi ");
  });

  it("presses the buttons from the keyboard with Ctrl or Cmd + B and I", async () => {
    const { user, textarea } = setupText("A good walk");
    selectText(textarea, 2, 6);
    await user.keyboard("{Control>}b{/Control}");
    expect(textarea).toHaveValue("A **good** walk");
    selectText(textarea, 11, 15);

    await user.keyboard("{Meta>}i{/Meta}");

    expect(textarea).toHaveValue("A **good** *walk*");
  });

  it("shows the highlighted words in a locked Link text field above the URL", async () => {
    const { user, textarea } = setupText("See menu here");
    selectText(textarea, 4, 8);

    await user.click(formatButton("Link"));

    const linkText = screen.getByLabelText("Link text");
    expect(linkText).toHaveValue("menu");
    expect(linkText).toHaveAttribute("readonly");
  });

  it("shows Link as pressed while its panel is open, and closes the panel on a second click", async () => {
    const { user, textarea } = setupText("See menu here");
    selectText(textarea, 4, 8);
    await user.click(formatButton("Link"));
    expect(formatButton("Link")).toHaveAttribute("aria-pressed", "true");

    await user.click(formatButton("Link"));

    expect(screen.queryByLabelText("Link URL")).not.toBeInTheDocument();
    expect(formatButton("Link")).toHaveAttribute("aria-pressed", "false");
    expect(textarea).toHaveValue("See menu here");
  });

  it("adds a typed link at the cursor when nothing is highlighted", async () => {
    const { user, textarea } = setupText("See ");
    selectText(textarea, 4, 4);
    await user.keyboard("{Control>}k{/Control}");
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(screen.getByText("Each link needs link text.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Link text"), "our menu");
    await user.type(
      screen.getByLabelText("Link URL"),
      "https://example.com/menu",
    );

    await user.click(screen.getByRole("button", { name: "Add link" }));

    expect(textarea).toHaveValue("See [our menu](https://example.com/menu)");
  });

  it("wraps the selected words in ** for Bold and keeps them selected", async () => {
    const { user, textarea } = setupText("A good walk");
    selectText(textarea, 2, 6);

    await user.click(
      screen.getByRole("button", { name: "Bold text in paragraph 1" }),
    );

    expect(textarea).toHaveValue("A **good** walk");
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([4, 8]);
  });

  it("leaves spaces at the ends of the selection outside the markers", async () => {
    const { user, textarea } = setupText("A good walk");
    selectText(textarea, 1, 7);

    await user.click(
      screen.getByRole("button", { name: "Bold text in paragraph 1" }),
    );

    expect(textarea).toHaveValue("A **good** walk");
  });

  it("wraps the selected words in * for Italic", async () => {
    const { user, textarea } = setupText("A good walk");
    selectText(textarea, 2, 6);

    await user.click(
      screen.getByRole("button", { name: "Italic text in paragraph 1" }),
    );

    expect(textarea).toHaveValue("A *good* walk");
  });

  it("turns the selected words into a link once Add link gets an https:// URL", async () => {
    const { user, textarea } = setupText("See menu here");
    selectText(textarea, 4, 8);
    await user.click(
      screen.getByRole("button", { name: "Link text in paragraph 1" }),
    );
    await user.type(screen.getByLabelText("Link URL"), "http://x.com");
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(
      screen.getByText("Each link must be a valid URL starting with https://"),
    ).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Link URL"));
    await user.type(
      screen.getByLabelText("Link URL"),
      "https://example.com/menu",
    );

    await user.click(screen.getByRole("button", { name: "Add link" }));

    expect(textarea).toHaveValue("See [menu](https://example.com/menu) here");
    expect(screen.queryByLabelText("Link URL")).not.toBeInTheDocument();
  });

  it("drops the Link URL field on Cancel, leaving the text as it was", async () => {
    const { user, textarea } = setupText("See menu here");
    selectText(textarea, 4, 8);
    await user.click(
      screen.getByRole("button", { name: "Link text in paragraph 1" }),
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Link URL")).not.toBeInTheDocument();
    expect(textarea).toHaveValue("See menu here");
  });

  it("closes the Link URL field when the paragraph's text is edited", async () => {
    const { user, textarea } = setupText("See menu here");
    selectText(textarea, 4, 8);
    await user.click(
      screen.getByRole("button", { name: "Link text in paragraph 1" }),
    );

    await user.type(textarea, "!");

    expect(screen.queryByLabelText("Link URL")).not.toBeInTheDocument();
  });

  it.each([
    ["Bold", "A **good** walk"],
    ["Italic", "A *good* walk"],
  ])(
    "switches %s off again on a second click, keeping the words selected",
    async (label, formatted) => {
      const { user, textarea } = setupText("A good walk");
      selectText(textarea, 2, 6);
      const button = screen.getByRole("button", {
        name: `${label} text in paragraph 1`,
      });
      await user.click(button);
      expect(textarea).toHaveValue(formatted);
      expect(button).toHaveAttribute("aria-pressed", "true");

      await user.click(button);

      expect(textarea).toHaveValue("A good walk");
      expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 6]);
      expect(button).toHaveAttribute("aria-pressed", "false");
    },
  );

  it("removes a link from its highlighted words, keeping the words", async () => {
    const { user, textarea } = setupText(
      "See [menu](https://example.com) here",
    );
    selectText(textarea, 5, 9);
    const link = screen.getByRole("button", {
      name: "Link text in paragraph 1",
    });
    expect(link).toHaveAttribute("aria-pressed", "true");

    await user.click(link);

    expect(textarea).toHaveValue("See menu here");
    expect(screen.queryByLabelText("Link URL")).not.toBeInTheDocument();
  });

  it("removes the format when the whole markup is highlighted", async () => {
    const { user, textarea } = setupText("A **good** walk");
    selectText(textarea, 2, 10);

    await user.click(
      screen.getByRole("button", { name: "Bold text in paragraph 1" }),
    );

    expect(textarea).toHaveValue("A good walk");
  });

  it("makes bold words bold and italic, then just italic, from the two buttons", async () => {
    const { user, textarea } = setupText("A **good** walk");
    selectText(textarea, 4, 8);
    await user.click(formatButton("Italic"));
    expect(textarea).toHaveValue("A ***good*** walk");
    expect(formatButton("Bold")).toHaveAttribute("aria-pressed", "true");
    expect(formatButton("Italic")).toHaveAttribute("aria-pressed", "true");

    await user.click(formatButton("Bold"));

    expect(textarea).toHaveValue("A *good* walk");
    expect(formatButton("Bold")).toHaveAttribute("aria-pressed", "false");
    expect(formatButton("Italic")).toHaveAttribute("aria-pressed", "true");
  });

  it("types bold and italic at the cursor after Bold then Italic", async () => {
    const { user, textarea } = setupText("Hi ");
    selectText(textarea, 3, 3);
    await user.click(formatButton("Bold"));
    await user.click(formatButton("Italic"));
    expect(textarea).toHaveValue("Hi ******");

    await user.keyboard("both");

    expect(textarea).toHaveValue("Hi ***both***");
    expect(formatButton("Bold")).toHaveAttribute("aria-pressed", "true");
    expect(formatButton("Italic")).toHaveAttribute("aria-pressed", "true");
  });

  it("adds italic to bold being typed, keeping the cursor in its place", async () => {
    const { user, textarea } = setupText("Hi **bo**");
    selectText(textarea, 7, 7);

    await user.click(formatButton("Italic"));
    await user.keyboard("ld");

    expect(textarea).toHaveValue("Hi ***bold***");
  });

  it("makes a link bold when its text is highlighted, and removes just the link after", async () => {
    const { user, textarea } = setupText(
      "See [menu](https://example.com) here",
    );
    selectText(textarea, 5, 9);
    await user.click(formatButton("Bold"));
    expect(textarea).toHaveValue("See **[menu](https://example.com)** here");
    selectText(textarea, 7, 11);
    expect(formatButton("Bold")).toHaveAttribute("aria-pressed", "true");
    expect(formatButton("Link")).toHaveAttribute("aria-pressed", "true");

    await user.click(formatButton("Link"));

    expect(textarea).toHaveValue("See **menu** here");
  });

  it("adds a link at the cursor inside bold text", async () => {
    const { user, textarea } = setupText("**see **");
    selectText(textarea, 6, 6);
    await user.click(formatButton("Link"));
    await user.type(screen.getByLabelText("Link text"), "the map");
    await user.type(screen.getByLabelText("Link URL"), "https://example.com");

    await user.click(screen.getByRole("button", { name: "Add link" }));

    expect(textarea).toHaveValue("**see [the map](https://example.com)**");
  });

  it("shows a bad link's message straight away, before the field is left", () => {
    setupText("See [menu](http://example.com)");

    expect(
      screen.getByText("Each link must be a valid URL starting with https://"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Complete or delete paragraph to submit."),
    ).not.toBeInTheDocument();
  });
});
