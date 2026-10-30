// Tests for ParagraphField (docs/flows.md → Paragraph formatting): its Bold / Italic / Link
// buttons and their shortcuts, the Link panel, the links list with its Edit and Delete, and the
// messages for a bad link. ParagraphField is controlled; the harness owns its value the way
// PostForm's paragraph dialogs own their draft.

import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ParagraphField from "./ParagraphField";
import { selectText } from "../../test/helpers";

function Harness({ initialText }) {
  const [value, setValue] = useState({ type: "paragraph", text: initialText });
  return (
    <ParagraphField
      name="paragraph 1"
      value={value}
      onChange={(changes) =>
        setValue((current) => ({ ...current, ...changes }))
      }
    />
  );
}

function setup(text) {
  const user = userEvent.setup();
  render(<Harness initialText={text} />);
  return { user };
}

describe("ParagraphField", () => {
  it("counts the paragraph's characters out of 10000 beside its label", async () => {
    const { user } = setup("");

    await user.type(screen.getByLabelText("Paragraph"), "Hello");

    expect(screen.getByText("5 / 10000")).toBeInTheDocument();
    expect(screen.getByLabelText("Paragraph")).toHaveAccessibleDescription(
      "5 / 10000",
    );
  });

  it('shows "Paragraph is required." once a blank paragraph has been left', async () => {
    const { user } = setup("");

    await user.click(screen.getByLabelText("Paragraph"));
    await user.tab();

    expect(screen.getByText("Paragraph is required.")).toBeInTheDocument();
  });
});

describe("ParagraphField formatting", () => {
  function setupText(text) {
    const result = setup(text);
    return { ...result, textarea: screen.getByLabelText("Paragraph") };
  }

  // A row of the paragraph's links list, by its Edit button.
  function linkRow(number) {
    return screen
      .getByRole("button", { name: `Edit link ${number} in paragraph 1` })
      .closest("li");
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

    expect(textarea).toHaveValue(
      "See **[our menu](https://example.com/menu)**",
    );
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

    expect(textarea).toHaveValue(
      "See **[menu](https://example.com/menu)** here",
    );
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

  it("adds a link at the cursor inside bold text", async () => {
    const { user, textarea } = setupText("**see **");
    selectText(textarea, 6, 6);
    await user.click(formatButton("Link"));
    await user.type(screen.getByLabelText("Link text"), "the map");
    await user.type(screen.getByLabelText("Link URL"), "https://example.com");

    await user.click(screen.getByRole("button", { name: "Add link" }));

    expect(textarea).toHaveValue("**see [the map](https://example.com)**");
  });

  it("shows a bad link's message straight away, under the paragraph and on its row", async () => {
    const { user, textarea } = setupText("See [menu](http://example.com)");
    await user.click(screen.getByText("Links in this paragraph"));

    expect(textarea.nextElementSibling).toHaveTextContent(
      "Each link must be a valid URL starting with https://",
    );
    expect(
      within(linkRow(1)).getByText(
        "Each link must be a valid URL starting with https://",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Complete or delete paragraph to submit."),
    ).not.toBeInTheDocument();
  });
});

describe("ParagraphField links list", () => {
  function setupText(text) {
    const result = setup(text);
    return { ...result, textarea: screen.getByLabelText("Paragraph") };
  }

  function button(name) {
    return screen.getByRole("button", { name });
  }

  // The list is a disclosure, closed to start with; this opens it the way a site owner does.
  async function openList(user) {
    await user.click(screen.getByText("Links in this paragraph"));
  }

  it("keeps the list closed until it is opened", async () => {
    const { user } = setupText("See [menu](https://example.com/menu)");
    const list = screen.getByText("Links in this paragraph").closest("details");
    expect(list).not.toHaveAttribute("open");

    await openList(user);

    expect(list).toHaveAttribute("open");
  });

  it("lists each link in the paragraph, typed by hand or added, and nothing without links", async () => {
    const { user, textarea } = setupText(
      "See [menu](https://example.com/menu) ",
    );
    await openList(user);
    expect(screen.getByText("https://example.com/menu")).toBeInTheDocument();
    selectText(textarea, 37, 37);
    await user.click(button("Link text in paragraph 1"));
    await user.type(screen.getByLabelText("Link text"), "map");
    await user.type(
      screen.getByLabelText("Link URL"),
      "https://example.com/map",
    );

    await user.click(button("Add link"));

    expect(button("Edit link 2 in paragraph 1")).toBeInTheDocument();
  });

  it("shows no list for a paragraph without links", () => {
    setupText("Just words.");

    expect(
      screen.queryByText("Links in this paragraph"),
    ).not.toBeInTheDocument();
  });

  it("edits a link's text and URL from its row, leaving the rest of the text alone", async () => {
    const { user, textarea } = setupText(
      "See [menu](https://example.com/menu) and [map](https://example.com/map).",
    );
    await openList(user);
    await user.click(button("Edit link 2 in paragraph 1"));
    const linkText = screen.getByLabelText("Link text");
    expect(linkText).toHaveValue("map");
    expect(linkText).not.toHaveAttribute("readonly");
    await user.clear(linkText);
    await user.type(linkText, "our map");
    await user.clear(screen.getByLabelText("Link URL"));
    await user.type(
      screen.getByLabelText("Link URL"),
      "https://maps.example.com",
    );

    await user.click(button("Update link"));

    expect(textarea).toHaveValue(
      "See [menu](https://example.com/menu) and [our map](https://maps.example.com).",
    );
  });

  it("leaves the text as it was when an edit is cancelled", async () => {
    const { user, textarea } = setupText(
      "See [menu](https://example.com/menu)",
    );
    await openList(user);
    await user.click(button("Edit link 1 in paragraph 1"));
    await user.clear(screen.getByLabelText("Link URL"));

    await user.click(button("Cancel"));

    expect(textarea).toHaveValue("See [menu](https://example.com/menu)");
    expect(screen.queryByLabelText("Link URL")).not.toBeInTheDocument();
  });

  it("adds a new link bold by default", async () => {
    const { user, textarea } = setupText("See ");
    selectText(textarea, 4, 4);
    await user.click(button("Link text in paragraph 1"));
    expect(button("Bold link")).toHaveAttribute("aria-pressed", "true");
    await user.type(screen.getByLabelText("Link text"), "menu");
    await user.type(screen.getByLabelText("Link URL"), "https://example.com");

    await user.click(button("Add link"));

    expect(textarea).toHaveValue("See **[menu](https://example.com)**");
  });

  it("adds a plain link with Bold switched off in the panel", async () => {
    const { user, textarea } = setupText("See ");
    selectText(textarea, 4, 4);
    await user.click(button("Link text in paragraph 1"));
    await user.type(screen.getByLabelText("Link text"), "menu");
    await user.type(screen.getByLabelText("Link URL"), "https://example.com");
    await user.click(button("Bold link"));

    await user.click(button("Add link"));

    expect(textarea).toHaveValue("See [menu](https://example.com)");
  });

  it("offers only Bold for a link's look, with no Italic", async () => {
    const { user, textarea } = setupText("See ");
    selectText(textarea, 4, 4);

    await user.click(button("Link text in paragraph 1"));

    expect(
      screen.queryByRole("button", { name: "Italic link" }),
    ).not.toBeInTheDocument();
  });

  it("shows a bold link's B as pressed when editing, and switches it off", async () => {
    const { user, textarea } = setupText("See **[menu](https://example.com)**");
    await openList(user);
    await user.click(button("Edit link 1 in paragraph 1"));
    expect(button("Bold link")).toHaveAttribute("aria-pressed", "true");

    await user.click(button("Bold link"));
    await user.click(button("Update link"));

    expect(textarea).toHaveValue("See [menu](https://example.com)");
  });

  it("shows the bold of the words around a link as on but locked, with a note", async () => {
    const { user } = setupText("**see [map](https://example.com) now**");

    await openList(user);
    await user.click(button("Edit link 1 in paragraph 1"));

    expect(button("Bold link")).toHaveAttribute("aria-pressed", "true");
    expect(button("Bold link")).toBeDisabled();
    expect(
      screen.getByText("Bold from the words around it."),
    ).toBeInTheDocument();
  });

  it("deletes a link but keeps its words and its own bold", async () => {
    const { user, textarea } = setupText(
      "See **[menu](https://example.com)** now",
    );

    await openList(user);
    await user.click(button("Delete link 1 in paragraph 1"));

    expect(textarea).toHaveValue("See **menu** now");
    expect(
      screen.queryByText("Links in this paragraph"),
    ).not.toBeInTheDocument();
  });

  it("disables the toolbar with the cursor in a link, or a highlight over part of one", () => {
    const { textarea } = setupText("See [menu](https://example.com) now");

    selectText(textarea, 6, 6);
    for (const label of ["Bold", "Italic", "Link"]) {
      expect(button(`${label} text in paragraph 1`)).toBeDisabled();
    }
    selectText(textarea, 0, 7);
    expect(button("Bold text in paragraph 1")).toBeDisabled();
  });

  it("disables Bold and Italic for a highlight that holds a whole link", () => {
    const { textarea } = setupText("See [menu](https://example.com) now");

    selectText(textarea, 0, 35);

    expect(button("Bold text in paragraph 1")).toBeDisabled();
    expect(button("Italic text in paragraph 1")).toBeDisabled();
  });

  it("keeps a hand-typed italic link's italic when its Bold is switched on", async () => {
    const { user, textarea } = setupText("See *[menu](https://example.com)*");
    await openList(user);
    await user.click(button("Edit link 1 in paragraph 1"));

    await user.click(button("Bold link"));
    await user.click(button("Update link"));

    expect(textarea).toHaveValue("See ***[menu](https://example.com)***");
  });

  it("shows Edit as pressed while its panel is open, and closes the panel on a second click", async () => {
    const { user } = setupText("See [menu](https://example.com/menu)");
    await openList(user);
    await user.click(button("Edit link 1 in paragraph 1"));
    expect(button("Edit link 1 in paragraph 1")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(button("Edit link 1 in paragraph 1"));

    expect(screen.queryByLabelText("Link URL")).not.toBeInTheDocument();
    expect(button("Edit link 1 in paragraph 1")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps Update link disabled until the link's text, URL or look changes", async () => {
    const { user } = setupText("See [menu](https://example.com/menu)");
    await openList(user);
    await user.click(button("Edit link 1 in paragraph 1"));
    expect(button("Update link")).toBeDisabled();

    await user.type(screen.getByLabelText("Link URL"), "s");

    expect(button("Update link")).toBeEnabled();
  });

  it("keeps Add link disabled until both fields are valid, with the URL checked once left", async () => {
    const { user, textarea } = setupText("See ");
    selectText(textarea, 4, 4);
    await user.click(button("Link text in paragraph 1"));
    await user.type(screen.getByLabelText("Link text"), "menu");
    await user.type(screen.getByLabelText("Link URL"), "http://example.com");
    expect(button("Add link")).toBeDisabled();

    await user.tab();

    expect(
      screen.getByText("Each link must be a valid URL starting with https://"),
    ).toBeInTheDocument();
  });

  it("closes the list after a link is deleted", async () => {
    const { user } = setupText(
      "See [menu](https://example.com/menu) and [map](https://example.com/map)",
    );
    await openList(user);
    const list = screen.getByText("Links in this paragraph").closest("details");

    await user.click(button("Delete link 1 in paragraph 1"));

    expect(list).not.toHaveAttribute("open");
  });
});
