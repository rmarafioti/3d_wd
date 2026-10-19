// Tests for FormattedText (docs/api.md → Paragraph formatting): every Rendering examples row, and
// only https:// links becoming <a>.
// These compare the rendered HTML, not roles: the markup is the behaviour here, and the contract's
// table is written as HTML. The new-tab attributes are the renderer's own choice (rule 7), so
// they are stripped before comparing.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FormattedText from "./FormattedText";

function renderedHtml(text) {
  const { container } = render(
    <p>
      <FormattedText text={text} />
    </p>,
  );
  return container.firstChild.innerHTML.replaceAll(
    ' target="_blank" rel="noopener noreferrer"',
    "",
  );
}

describe("FormattedText", () => {
  // docs/api.md → Paragraph formatting → Rendering examples, row for row.
  it.each([
    ["Hello **world**", "Hello <b>world</b>"],
    ["An *easy* walk", "An <i>easy</i> walk"],
    [
      "See [our menu](https://example.com/menu).",
      'See <a href="https://example.com/menu">our menu</a>.',
    ],
    [
      "**Bold** and *italic* and [a link](https://example.com)",
      '<b>Bold</b> and <i>italic</i> and <a href="https://example.com">a link</a>',
    ],
    ["5 * 3 * 2", "5 * 3 * 2"],
    ["** not bold **", "** not bold **"],
    ["*open", "*open"],
    ["[no url]", "[no url]"],
    ["[menu] (https://example.com)", "[menu] (https://example.com)"],
    ["**across\nlines**", "**across\nlines**"],
    ["_not italic_", "_not italic_"],
    ["**a *b* c**", "<b>a *b* c</b>"],
    [
      "[**Menu**](https://example.com)",
      '<a href="https://example.com">**Menu**</a>',
    ],
    ["<b>hi</b> & more", "&lt;b&gt;hi&lt;/b&gt; &amp; more"],
    ["***both***", "<b><i>both</i></b>"],
    ["*** spaced ***", "*** spaced ***"],
    ["**a*", "*<i>a</i>"],
    [
      "**[our menu](https://example.com/menu)**",
      '<b><a href="https://example.com/menu">our menu</a></b>',
    ],
    [
      "*see [the map](https://example.com/map)*",
      '<i>see <a href="https://example.com/map">the map</a></i>',
    ],
    [
      "***[both](https://example.com)***",
      '<b><i><a href="https://example.com">both</a></i></b>',
    ],
    [
      "**[a](https://example.com/**x)**",
      '<b><a href="https://example.com/**x">a</a></b>',
    ],
    // "(preview only)": saving rejects this link, but unsaved text still renders it as typed.
    ["[menu](http://example.com)", "[menu](http://example.com)"],
  ])("renders %j as the contract shows", (text, html) => {
    expect(renderedHtml(text)).toBe(html);
  });

  it("opens a link in a new tab", () => {
    render(<FormattedText text="[our menu](https://example.com/menu)" />);

    const link = screen.getByRole("link", { name: "our menu" });

    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it.each([["[x](javascript:alert(1))"], ["[x](http://example.com)"]])(
    "shows %j as typed, with no link",
    (text) => {
      render(<FormattedText text={text} />);

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(document.body).toHaveTextContent(text, {
        normalizeWhitespace: false,
      });
    },
  );
});
