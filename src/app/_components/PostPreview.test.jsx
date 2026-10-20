// Tests for PostPreview (docs/flows.md → Post preview): the header, sub header and date only when
// set, paragraphs with their formatting, an image only once its fields are complete, and the
// text shown while nothing has been typed.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PostPreview from "./PostPreview";

const PARAGRAPH = { key: "p1", type: "paragraph", text: "A **good** walk." };
const IMAGE = {
  key: "i1",
  type: "image",
  src: "https://res.cloudinary.com/demo/one.jpg",
  width: "800",
  height: "600",
  altText: "Stevie on the beach",
};

function renderPreview(values) {
  render(
    <PostPreview header="" subHeader="" postDate="" body={[]} {...values} />,
  );
}

describe("PostPreview", () => {
  it("shows the header, sub header and date when they are set", () => {
    renderPreview({
      header: "Beach day",
      subHeader: "Stevie meets the sea",
      postDate: "2026-10-07",
      body: [PARAGRAPH],
    });

    expect(
      screen.getByRole("heading", { name: "Beach day" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Stevie meets the sea")).toBeInTheDocument();
    expect(screen.getByText("2026-10-07")).toBeInTheDocument();
  });

  it("shows the date first, before the header", () => {
    renderPreview({
      header: "Beach day",
      postDate: "2026-10-07",
      body: [PARAGRAPH],
    });

    expect(
      screen
        .getByText("2026-10-07")
        .compareDocumentPosition(
          screen.getByRole("heading", { name: "Beach day" }),
        ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("leaves out a header that is only spaces", () => {
    renderPreview({ header: "   ", body: [PARAGRAPH] });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders a paragraph's formatting", () => {
    renderPreview({ body: [PARAGRAPH] });

    expect(screen.getByText(/walk\./)).toContainHTML("A <b>good</b> walk.");
  });

  it("leaves an image out until its fields are complete", () => {
    renderPreview({ body: [PARAGRAPH, { ...IMAGE, altText: "" }] });

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows a complete image with its alt text", () => {
    renderPreview({ body: [PARAGRAPH, IMAGE] });

    expect(
      screen.getByRole("img", { name: "Stevie on the beach" }),
    ).toHaveAttribute("src", "https://res.cloudinary.com/demo/one.jpg");
  });

  it("says where the post will show while nothing has been typed", () => {
    renderPreview({ body: [{ key: "p1", type: "paragraph", text: "" }] });

    expect(
      screen.getByText("Your post will show here as you type."),
    ).toBeInTheDocument();
  });
});
