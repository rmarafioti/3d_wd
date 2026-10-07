// Tests for ImageLinkFields (docs/flows.md → ImageLinkFields): drafts and the Add check, Delete,
// the 5-image / 10-link limits, width/height auto-fill (including a late load for an old URL),
// server messages on the right item, and onReindex on every add and delete.

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageLinkFields from "./ImageLinkFields";

const IMAGE = {
  key: "i1",
  src: "https://res.cloudinary.com/demo/one.jpg",
  width: "800",
  height: "600",
  altText: "Stevie",
};
const LINK = {
  key: "l1",
  name: "Instagram",
  url: "https://instagram.com/stevie",
};

// ImageLinkFields is controlled; this owns the arrays the way PostForm does.
function Harness({
  initialImages = [],
  initialLinks = [],
  fieldErrors = {},
  onReindex,
}) {
  const [images, setImages] = useState(initialImages);
  const [links, setLinks] = useState(initialLinks);
  return (
    <ImageLinkFields
      images={images}
      links={links}
      setImages={setImages}
      setLinks={setLinks}
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

function many(item, count) {
  return Array.from({ length: count }, (_, i) => ({
    ...item,
    key: `${item.key}-${i}`,
  }));
}

describe("ImageLinkFields", () => {
  it('shows every message when "Add" is pressed on an incomplete image draft', async () => {
    const { user, onReindex } = setup();

    await user.click(screen.getByRole("button", { name: "Add image" }));
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Image URL is required.")).toBeInTheDocument();
    expect(
      screen.getByText("Width must be a whole number between 1 and 10000."),
    ).toBeInTheDocument();
    expect(screen.getByText("Alt text is required.")).toBeInTheDocument();
    expect(onReindex).not.toHaveBeenCalled();
  });

  it("adds a valid link draft to the list and reindexes", async () => {
    const { user, onReindex } = setup();

    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.type(screen.getByLabelText("Link Name"), "Instagram");
    await user.type(
      screen.getByLabelText("URL"),
      "https://instagram.com/stevie",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add link" }),
    ).toBeInTheDocument();
    expect(onReindex).toHaveBeenCalledOnce();
  });

  it("removes an item with Delete and reindexes", async () => {
    const { user, onReindex } = setup({ initialLinks: [LINK] });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.queryByLabelText("Link Name")).not.toBeInTheDocument();
    expect(onReindex).toHaveBeenCalledOnce();
  });

  it("drops a draft on Cancel without adding it", async () => {
    const { user, onReindex } = setup();
    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.type(screen.getByLabelText("Link Name"), "Instagram");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Link Name")).not.toBeInTheDocument();
    expect(onReindex).not.toHaveBeenCalled();
  });

  it("disables adding at 5 images and 10 links", () => {
    setup({ initialImages: many(IMAGE, 5), initialLinks: many(LINK, 10) });

    expect(
      screen.getByRole("button", { name: "Maximum of 5 images" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Maximum of 10 links" }),
    ).toBeDisabled();
  });

  it("allows adding below the limits", () => {
    setup({ initialImages: many(IMAGE, 4), initialLinks: many(LINK, 9) });

    expect(screen.getByRole("button", { name: "Add image" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Add link" })).toBeEnabled();
  });

  it("fills Width and Height from the image once it loads", async () => {
    const loads = stubImageLoading();
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Add image" }));
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
      initialImages: [{ ...IMAGE, width: "", height: "" }],
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

  it("leaves Width and Height empty when the image never loads", async () => {
    stubImageLoading();
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Add image" }));
    await user.click(screen.getByLabelText("Image URL"));

    await user.paste("https://res.cloudinary.com/demo/missing.jpg");

    expect(screen.getByLabelText("Width")).toHaveValue(null);
  });

  it("shows a server message on the item its path points at", () => {
    setup({
      initialImages: [IMAGE, { ...IMAGE, key: "i2" }],
      fieldErrors: {
        "images.1.altText": "Alt text must be 200 characters or fewer.",
      },
    });

    const altInputs = screen.getAllByLabelText("Alt Text");
    expect(
      screen.getAllByText("Alt text must be 200 characters or fewer."),
    ).toHaveLength(1);
    expect(altInputs[1].nextElementSibling).toHaveTextContent(
      "Alt text must be 200 characters or fewer.",
    );
  });

  it("shows a list-level server message above the list", () => {
    setup({ fieldErrors: { images: "A post can have at most 5 images." } });

    expect(
      screen.getByText("A post can have at most 5 images."),
    ).toBeInTheDocument();
  });
});
