// Tests for ImageField (docs/flows.md → Post body dialogs): the file picker (refused files, a
// picked file shown from memory, an unreadable file let go of, a late load for a replaced file),
// an existing image from its stored src, the alt text note once a file is picked, the character
// count, and server messages. ImageField is controlled; the harness owns its value the way
// PostForm's image dialog owns its draft.

import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageField from "./ImageField";
import {
  imageFile,
  stubImageLoading,
  stubObjectUrls,
} from "../../test/helpers";

const IMAGE = {
  key: "i1",
  type: "image",
  src: "https://res.cloudinary.com/demo/image/upload/v1/3dwd-dev/stevie/one.jpg",
  width: 800,
  height: 600,
  altText: "Stevie",
};
const EMPTY_IMAGE = { ...IMAGE, src: "", width: null, height: null };

function Harness({ initialValue, serverErrors = {} }) {
  const [value, setValue] = useState(initialValue);
  return (
    <ImageField
      value={value}
      onPatch={(changes) => setValue((current) => ({ ...current, ...changes }))}
      serverErrors={serverErrors}
    />
  );
}

function setup(props, userOptions) {
  const user = userEvent.setup(userOptions);
  render(<Harness {...props} />);
  return { user };
}

describe("ImageField", () => {
  it.each([
    [
      "a gif",
      imageFile("dog.gif", "image/gif"),
      "Choose a jpg, png or webp image.",
    ],
    [
      "a file over 10 MB",
      imageFile("big.jpg", "image/jpeg", 10 * 1024 * 1024 + 1),
      "Images must be 10 MB or smaller.",
    ],
  ])("refuses %s before keeping it", async (_, file, message) => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = setup(
      { initialValue: { ...EMPTY_IMAGE, altText: "" } },
      { applyAccept: false },
    );

    await user.upload(screen.getByLabelText("Image"), file);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(loads).toHaveLength(0);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows a picked file from memory once it loads", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = setup({ initialValue: EMPTY_IMAGE });

    await user.upload(screen.getByLabelText("Image"), imageFile("dog.jpg"));
    loads.at(-1).load(1200, 900);

    const thumbnail = await screen.findByRole("img", { name: "Stevie" });
    expect(thumbnail).toHaveAttribute("src", "blob:test/1");
    expect(thumbnail).toHaveAttribute("width", "1200");
  });

  it("refuses a file that can't be read as an image, and lets go of its object URL", async () => {
    const loads = stubImageLoading();
    const { revokeObjectURL } = stubObjectUrls();
    const { user } = setup({ initialValue: EMPTY_IMAGE });

    await user.upload(screen.getByLabelText("Image"), imageFile("broken.jpg"));
    loads.at(-1).fail();

    expect(
      await screen.findByText("This file can't be read as an image."),
    ).toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });

  it("keeps the newer file when an older one finishes loading late", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = setup({ initialValue: EMPTY_IMAGE });
    const input = screen.getByLabelText("Image");

    await user.upload(input, imageFile("old.jpg"));
    await user.upload(input, imageFile("new.jpg"));
    loads[1].load(640, 480);
    loads[0].load(111, 222);

    const thumbnail = await screen.findByRole("img", { name: "Stevie" });
    expect(thumbnail).toHaveAttribute("src", "blob:test/2");
    expect(thumbnail).toHaveAttribute("width", "640");
  });

  it("never lets go of the image it replaces, which may still be the post's", async () => {
    const loads = stubImageLoading();
    const { revokeObjectURL } = stubObjectUrls();
    const { user } = setup({
      initialValue: { ...IMAGE, src: "blob:test/post" },
    });

    await user.upload(screen.getByLabelText("Image"), imageFile("two.jpg"));
    loads.at(-1).load(800, 600);
    await screen.findByRole("img", { name: "Stevie" });

    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it("shows an existing image from its stored src", () => {
    setup({ initialValue: IMAGE });

    expect(screen.getByRole("img", { name: "Stevie" })).toHaveAttribute(
      "src",
      IMAGE.src,
    );
  });

  it("notes that alt text is required to insert the image once a file is picked", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = setup({ initialValue: { ...EMPTY_IMAGE, altText: "" } });
    expect(
      screen.queryByText(/Alt text is required to insert the image/),
    ).not.toBeInTheDocument();

    await user.upload(screen.getByLabelText("Image"), imageFile("dog.jpg"));
    loads.at(-1).load(800, 600);

    expect(
      await screen.findByText("*Alt text is required to insert the image."),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Alt Text"), "Stevie");
    expect(
      screen.queryByText(/Alt text is required to insert the image/),
    ).not.toBeInTheDocument();
  });

  it("counts the alt text's characters out of 200", () => {
    setup({ initialValue: IMAGE });

    expect(screen.getByLabelText("Alt Text")).toHaveAccessibleDescription(
      "6 / 200",
    );
  });

  it("shows server messages under their fields", () => {
    setup({
      initialValue: IMAGE,
      serverErrors: {
        src: "Invalid image.",
        altText: "Alt text must be 200 characters or fewer.",
      },
    });

    expect(screen.getByText("Invalid image.")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Alt Text").nextElementSibling,
    ).toHaveTextContent("Alt text must be 200 characters or fewer.");
  });
});
