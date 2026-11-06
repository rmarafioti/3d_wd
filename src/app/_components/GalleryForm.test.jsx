// Tests for GalleryForm, Create and Edit a Gallery: the steps, the review view, the crop dialogs,
// consistent crops, Submit's uploads and scaled crops, Edit's payload and backend errors.

import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GalleryForm, { galleryToFormValues } from "./GalleryForm";
import { toPublishAt } from "../_lib/publishAt";
import {
  deferred,
  imageFile,
  mockFetch,
  pressEscape,
  stubImageLoading,
  stubImageShrinking,
  stubObjectUrls,
} from "../../test/helpers";

// react-easy-crop is third-party UI, so a stub stands in for it and reports the crop the test sets.
// What the stub cropper reports, in the shown image's natural pixels, and the aspect it was given.
const cropper = vi.hoisted(() => ({ pixels: null, aspects: [] }));

vi.mock("react-easy-crop", () => ({
  default: function FakeCropper({ aspect, onCropComplete }) {
    // Reports on every render, like the real one once its image has loaded.
    useEffect(() => {
      cropper.aspects.push(aspect);
      onCropComplete({}, cropper.pixels);
    });
    return null;
  },
}));

const FOLDER_URL =
  "https://res.cloudinary.com/demo/image/upload/v1792541844/3dwd-dev/steviethedog";
const STEVIE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  posts: [],
  galleries: [{ id: "g9", galleryName: "Artwork" }],
};
const GOOD_BOYS = {
  id: "w2",
  websiteName: "Good Boys",
  posts: [],
  galleries: [{ id: "g8", galleryName: "Our Interior" }],
};
const STORED_IMAGE = {
  id: "i1",
  src: `${FOLDER_URL}/stored0.jpg`,
  width: 800,
  height: 600,
  altText: "Stevie",
  caption: null,
  thumbnailCrop: { x: 100, y: 0, width: 600, height: 600 },
  mobileCrop: null,
};
const GALLERY = {
  id: "g1",
  websiteId: "w1",
  websiteName: "Stevie The Dog",
  galleryName: "Our Interior",
  slug: "our-interior",
  title: "Inside",
  copy: null,
  status: "published",
  publishAt: null,
  publishedAt: "2026-10-31T00:00:00.000Z",
  createdAt: "2026-10-31T00:00:00.000Z",
  updatedAt: "2026-10-31T00:00:00.000Z",
  images: [STORED_IMAGE, { ...STORED_IMAGE, id: "i2", altText: "Ball" }],
};

const UPLOAD_URL = "https://api.cloudinary.com/v1_1/demo/image/upload";
const SIGNATURE = {
  uploadUrl: UPLOAD_URL,
  fields: { folder: "3dwd-dev/steviethedog", signature: "0a1b2c" },
};

// Cloudinary's answer for the nth upload: a 4000 × 3000 file stored at 2500 × 1875.
function stored(n) {
  return {
    body: {
      secure_url: `${FOLDER_URL}/stored${n}.jpg`,
      width: 2500,
      height: 1875,
    },
  };
}

// The sign endpoint and Cloudinary, answering uploads in order (the last one repeats).
function mockUploads(uploads = [stored(1)]) {
  return mockFetch({
    "POST /api/siteOwner/uploads/sign": { body: { data: SIGNATURE } },
    [`POST ${UPLOAD_URL}`]: uploads,
  }).calls;
}

function dialog(title) {
  return screen.getByRole("dialog", { name: title });
}

function button(name, container = document.body) {
  return within(container).getByRole("button", { name });
}

// The review view's toolbar row whose text starts with label ("Mobile Shape").
function toolbarRow(label) {
  const toolbar = screen.getByRole("region", { name: "Gallery contents" });
  return within(toolbar)
    .getAllByRole("listitem")
    .find((row) => row.textContent.startsWith(label));
}

function renderCreate({ websites = [STEVIE], onSubmit = vi.fn() } = {}) {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <GalleryForm
      mode="create"
      websites={websites}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      onClose={onClose}
    />,
  );
  return { user, onSubmit, onSuccess, onClose };
}

function renderEdit({ gallery = GALLERY, onSubmit = vi.fn() } = {}) {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <GalleryForm
      mode="edit"
      websites={[{ ...STEVIE, galleries: [...STEVIE.galleries, gallery] }]}
      websiteId={gallery.websiteId}
      galleryId={gallery.id}
      initialValues={galleryToFormValues(gallery)}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      onClose={onClose}
    />,
  );
  return { user, onSubmit, onSuccess, onClose };
}

// In an open image dialog: pick a 4000 × 3000 file and let it load, then write its alt text.
async function pickImage(user, imageDialog, loads, altText = "Stevie") {
  await user.upload(
    within(imageDialog).getByLabelText("Image"),
    imageFile(`${altText}.jpg`),
  );
  loads.at(-1).load(4000, 3000);
  await user.type(within(imageDialog).getByLabelText("Alt Text"), altText);
}

// Walks Create's name and details steps, leaving the first image's step open.
async function walkToFirstImage(user, galleryName = "Inside") {
  await user.type(screen.getByLabelText("Gallery Name"), galleryName);
  await user.click(button("Next"));
  await user.click(button("Next"));
}

// A 1600 px square crop on a picked 4000 × 3000 file.
const SQUARE = { x: 0, y: 0, width: 1600, height: 1600 };

// From an open image dialog: crop with the stub reporting `pixels`, then Save.
async function crop(user, imageDialog, action, pixels) {
  cropper.pixels = pixels;
  await user.click(button(action, imageDialog));
  const title =
    action === "Crop thumbnail" ? "Crop thumbnail" : "Crop for mobile";
  await user.click(button("Save", dialog(title)));
}

describe("GalleryForm (create) steps", () => {
  it("disables Next until the gallery has a name", async () => {
    const { user } = renderCreate();

    expect(button("Next")).toBeDisabled();
    await user.type(screen.getByLabelText("Gallery Name"), "Inside");

    expect(button("Next")).toBeEnabled();
  });

  it("refuses a name the website's other galleries have, in any case, as soon as it is typed", async () => {
    const { user } = renderCreate();

    await user.type(screen.getByLabelText("Gallery Name"), "ARTWORK");

    expect(
      screen.getByText("A gallery with this name already exists."),
    ).toBeInTheDocument();
    expect(button("Next")).toBeDisabled();
  });

  it("checks the name only against the chosen website's galleries", async () => {
    const { user } = renderCreate({ websites: [STEVIE, GOOD_BOYS] });
    await user.type(screen.getByLabelText("Gallery Name"), "Our Interior");

    await user.selectOptions(screen.getByLabelText("Website"), "w1");
    expect(button("Next")).toBeEnabled();
    await user.selectOptions(screen.getByLabelText("Website"), "w2");

    expect(button("Next")).toBeDisabled();
  });

  it("leads from the first image's Insert to the review view, where the only image has no Delete", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = renderCreate();
    await walkToFirstImage(user);
    const imageDialog = dialog("Add your first image");
    expect(button("Insert", imageDialog)).toBeDisabled();

    await pickImage(user, imageDialog, loads);
    await user.click(button("Insert", imageDialog));
    await user.click(button("Actions for image 1"));

    expect(dialog("Create a Gallery")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });
});

describe("GalleryForm crops", () => {
  it("offers the mobile shapes, 4:5 first, and gives the cropper the picked shape", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = renderCreate();
    await walkToFirstImage(user);
    const imageDialog = dialog("Add your first image");
    await pickImage(user, imageDialog, loads);
    cropper.aspects = [];

    await user.click(button("Crop for mobile", imageDialog));
    const cropDialog = dialog("Crop for mobile");
    expect(within(cropDialog).getByLabelText("4:5")).toBeChecked();
    await user.click(within(cropDialog).getByLabelText("9:16"));

    expect(cropper.aspects[0]).toBe(4 / 5);
    expect(cropper.aspects.at(-1)).toBe(9 / 16);
  });

  it("shows a saved crop, and clears both crops when another file is picked", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = renderCreate();
    await walkToFirstImage(user);
    const imageDialog = dialog("Add your first image");
    await pickImage(user, imageDialog, loads);

    await crop(user, imageDialog, "Crop thumbnail", {
      x: 0,
      y: 0,
      width: 1600,
      height: 1600,
    });
    expect(
      within(imageDialog).getByRole("img", { name: "Thumbnail crop" }),
    ).toBeInTheDocument();
    await user.upload(
      within(imageDialog).getByLabelText("Image"),
      imageFile("other.jpg"),
    );
    act(() => loads.at(-1).load(4000, 3000));

    expect(
      within(imageDialog).queryByRole("img", { name: "Thumbnail crop" }),
    ).not.toBeInTheDocument();
    expect(button("Crop thumbnail", imageDialog)).toBeInTheDocument();
    expect(button("Crop for mobile", imageDialog)).toBeInTheDocument();
  });
});

describe("GalleryForm submit", () => {
  it("uploads the new image shrunk, then saves it with Cloudinary's src and size and its crops scaled to them", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    // The picked photo is 4000 × 3000 (pickImage), shrunk to 2500 × 1875 before it goes up; the
    // crops were drawn on the picked size and land in the same place on the stored one.
    const { encodes } = stubImageShrinking({ width: 4000, height: 3000 });
    const calls = mockUploads();
    const onSubmit = vi.fn().mockResolvedValue(GALLERY);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await walkToFirstImage(user, " Inside ");
    const imageDialog = dialog("Add your first image");
    await pickImage(user, imageDialog, loads);
    await user.type(within(imageDialog).getByLabelText("Caption"), "Couch");
    await crop(user, imageDialog, "Crop thumbnail", {
      x: 403,
      y: 301,
      width: 1600,
      height: 1600,
    });
    await crop(user, imageDialog, "Crop for mobile", {
      x: 0,
      y: 0,
      width: 1200,
      height: 1500,
    });
    await user.click(button("Insert", imageDialog));

    await user.click(button("Submit"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(calls.map((call) => call.path)).toEqual([
      "/api/siteOwner/uploads/sign",
      UPLOAD_URL,
    ]);
    expect(encodes).toEqual([
      expect.objectContaining({ width: 2500, height: 1875 }),
    ]);
    expect(onSubmit).toHaveBeenCalledWith({
      websiteId: "w1",
      galleryName: "Inside",
      title: null,
      copy: null,
      status: "published",
      images: [
        {
          src: `${FOLDER_URL}/stored1.jpg`,
          width: 2500,
          height: 1875,
          altText: "Stevie",
          caption: "Couch",
          thumbnailCrop: { x: 252, y: 188, width: 1000, height: 1000 },
          mobileCrop: { x: 0, y: 0, width: 750, height: 938 },
        },
      ],
    });
  });

  it("keeps an image that uploaded when another fails, and scales its crop only once across the retry", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    stubImageShrinking({ width: 4000, height: 3000 });
    const calls = mockUploads([
      stored(1),
      {
        status: 400,
        body: { error: { message: "Image file format gif not allowed" } },
      },
      stored(2),
    ]);
    const onSubmit = vi.fn().mockResolvedValue(GALLERY);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await walkToFirstImage(user);
    const firstDialog = dialog("Add your first image");
    await pickImage(user, firstDialog, loads, "Stevie");
    await crop(user, firstDialog, "Crop thumbnail", SQUARE);
    await user.click(button("Insert", firstDialog));
    await user.click(button("Add Image"));
    const secondDialog = dialog("Add an image");
    await pickImage(user, secondDialog, loads, "Ball");
    await crop(user, secondDialog, "Crop thumbnail", SQUARE);
    await user.click(button("Insert", secondDialog));
    await user.click(button("Submit"));
    expect(
      await screen.findByText(
        "1 of your 2 images couldn't be uploaded. Press Submit to try it again.",
      ),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(button("Submit"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(calls.filter((call) => call.path === UPLOAD_URL)).toHaveLength(3);
    // The 1600 px square drawn on the picked 4000 × 3000 file is 1000 px on the stored 2500 × 1875.
    const scaled = { x: 0, y: 0, width: 1000, height: 1000 };
    expect(
      onSubmit.mock.calls[0][0].images.map(({ src, thumbnailCrop }) => ({
        src,
        thumbnailCrop,
      })),
    ).toEqual([
      { src: `${FOLDER_URL}/stored1.jpg`, thumbnailCrop: scaled },
      { src: `${FOLDER_URL}/stored2.jpg`, thumbnailCrop: scaled },
    ]);
  });

  it("shows the backend's 409 under Submit and keeps everything entered", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    mockUploads();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error("A gallery with this name already exists."), {
        status: 409,
      }),
    );
    const { user } = renderCreate({ onSubmit });
    await walkToFirstImage(user);
    await pickImage(user, dialog("Add your first image"), loads);
    await user.click(button("Insert"));

    await user.click(button("Submit"));

    expect(
      await screen.findByText("A gallery with this name already exists."),
    ).toBeInTheDocument();
    expect(button("Submit")).toBeEnabled();
  });

  it('names the save step "Saving your gallery…" in the progress dialog', async () => {
    const save = deferred();
    const { user } = renderEdit({
      onSubmit: vi.fn().mockReturnValue(save.promise),
    });

    await user.click(button("Submit"));

    expect(
      await screen.findByRole("dialog", { name: "Saving your gallery…" }),
    ).toBeInTheDocument();
  });
});

describe("GalleryForm (edit)", () => {
  it("opens on the review view and sends the full form, keeping ids and stored crops as they are", async () => {
    const onSubmit = vi.fn().mockResolvedValue(GALLERY);
    const { user, onSuccess } = renderEdit({ onSubmit });

    await user.click(button("Actions for image 2"));
    await user.click(button("Move image 2 up"));
    await user.click(button("Submit"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      galleryName: "Our Interior",
      title: "Inside",
      copy: null,
      images: [
        {
          id: "i2",
          src: STORED_IMAGE.src,
          width: 800,
          height: 600,
          altText: "Ball",
          caption: null,
          thumbnailCrop: { x: 100, y: 0, width: 600, height: 600 },
          mobileCrop: null,
        },
        {
          id: "i1",
          src: STORED_IMAGE.src,
          width: 800,
          height: 600,
          altText: "Stevie",
          caption: null,
          thumbnailCrop: { x: 100, y: 0, width: 600, height: 600 },
          mobileCrop: null,
        },
      ],
    });
  });

  it("lets a gallery keep its own name but not take another gallery's", async () => {
    const { user } = renderEdit();
    await user.click(button("Actions for gallery name"));
    await user.click(button("Edit"));
    const nameDialog = dialog("Edit gallery name");
    const input = within(nameDialog).getByLabelText("Gallery Name");

    expect(button("Save", nameDialog)).toBeEnabled();
    await user.clear(input);
    await user.type(input, "artwork");

    expect(
      within(nameDialog).getByText("A gallery with this name already exists."),
    ).toBeInTheDocument();
    expect(button("Save", nameDialog)).toBeDisabled();
  });

  it("disables Add Image at 30 images", () => {
    const images = Array.from({ length: 30 }, (_, index) => ({
      ...STORED_IMAGE,
      id: `i${index}`,
    }));
    renderEdit({ gallery: { ...GALLERY, images } });

    expect(button("Add Image")).toBeDisabled();
    expect(screen.getByText("Maximum of 30 images")).toBeInTheDocument();
  });

  it("shows a crop's backend message under its image's row and in its dialog", async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error("Please fix the highlighted fields."), {
        status: 400,
        fields: {
          "images.0.thumbnailCrop":
            "Thumbnail crop must be a square inside the image.",
        },
      }),
    );
    const { user } = renderEdit({ onSubmit });
    await user.click(button("Submit"));
    await screen.findByText(
      "Thumbnail crop must be a square inside the image.",
    );

    await user.click(button("Actions for image 1"));
    await user.click(button("Edit"));

    expect(
      within(dialog("Edit image")).getByText(
        "Thumbnail crop must be a square inside the image.",
      ),
    ).toBeInTheDocument();
  });
});

describe("GalleryForm publish date", () => {
  it("shows a draft's publish date with the placement note, and sends a changed date", async () => {
    const onSubmit = vi.fn().mockResolvedValue(GALLERY);
    const draft = {
      ...GALLERY,
      status: "draft",
      publishAt: toPublishAt("2030-11-20"),
    };
    const { user } = renderEdit({ gallery: draft, onSubmit });
    expect(screen.getByLabelText("Date")).toHaveValue("2030-11-20");
    expect(
      screen.getByText(/also needs its placement before it shows/),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2030-12-01");
    await user.click(button("Submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].publishAt).toBe(toPublishAt("2030-12-01"));
  });

  it("shows no publish date on a published gallery's Edit, and sends none", async () => {
    const onSubmit = vi.fn().mockResolvedValue(GALLERY);
    const { user } = renderEdit({ onSubmit });
    expect(screen.queryByLabelText("Date")).not.toBeInTheDocument();

    await user.click(button("Submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("publishAt");
  });
});

describe("GalleryForm consistent crops", () => {
  // Image 1 has a thumbnail crop and a 4:5 mobile crop; image 2 has neither.
  const MIXED = {
    ...GALLERY,
    images: [
      {
        ...STORED_IMAGE,
        mobileCrop: { x: 0, y: 0, width: 400, height: 500 },
      },
      { ...STORED_IMAGE, id: "i2", altText: "Ball", thumbnailCrop: null },
    ],
  };

  it("marks an image missing the others' crops, says so under Images, and holds Submit", () => {
    renderEdit({ gallery: MIXED });

    const images = screen.getByRole("list", { name: "Images" });
    expect(images.children[1]).toHaveTextContent(
      "Needs a thumbnail crop. Needs a mobile crop.",
    );
    expect(
      screen.getByText(
        "Add a thumbnail crop to every image, or remove them all.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add a mobile crop to every image, or remove them all."),
    ).toBeInTheDocument();
    expect(button("Submit")).toBeDisabled();
  });

  it("enables Submit once the crops match, or are removed everywhere", async () => {
    const { user } = renderEdit({ gallery: MIXED });

    await user.click(button("Actions for image 1"));
    await user.click(button("Edit"));
    const imageDialog = dialog("Edit image");
    await user.click(button("Remove thumbnail crop", imageDialog));
    await user.click(button("Remove mobile crop", imageDialog));
    await user.click(button("Insert", imageDialog));

    expect(button("Submit")).toBeEnabled();
  });

  it("holds a new image's Insert until it has the crops the others have, marked required", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = renderEdit();
    await user.click(button("Add Image"));
    const imageDialog = dialog("Add an image");
    await pickImage(user, imageDialog, loads);

    expect(
      within(imageDialog).getByText(
        "*Required, since your other images have one.",
      ),
    ).toBeInTheDocument();
    expect(button("Insert", imageDialog)).toBeDisabled();
    await crop(user, imageDialog, "Crop thumbnail", {
      x: 0,
      y: 0,
      width: 1000,
      height: 1000,
    });

    expect(button("Insert", imageDialog)).toBeEnabled();
  });

  it("shows the Shape choices only for the gallery's first mobile crop", async () => {
    const { user } = renderEdit({ gallery: MIXED });
    cropper.aspects = [];

    await user.click(button("Actions for image 2"));
    await user.click(button("Edit"));
    await user.click(button("Crop for mobile", dialog("Edit image")));

    expect(
      within(dialog("Crop for mobile")).queryByRole("group", { name: "Shape" }),
    ).not.toBeInTheDocument();
    expect(cropper.aspects.at(-1)).toBe(4 / 5);
  });

  it("changes the gallery's mobile shape from the toolbar, reshaping every mobile crop around its centre", async () => {
    const onSubmit = vi.fn().mockResolvedValue(GALLERY);
    const { user } = renderEdit({
      onSubmit,
      gallery: {
        ...GALLERY,
        images: GALLERY.images.map((image) => ({
          ...image,
          mobileCrop: { x: 100, y: 50, width: 400, height: 500 },
        })),
      },
    });
    expect(toolbarRow("Mobile Shape")).toHaveTextContent("Mobile Shape: 4:5");

    await user.click(button("Actions for mobile shape"));
    await user.click(button("Edit"));
    const shapeDialog = dialog("Edit mobile shape");
    await user.click(within(shapeDialog).getByLabelText("9:16"));
    await user.click(button("Save", shapeDialog));
    await user.click(button("Submit"));

    expect(toolbarRow("Mobile Shape")).toHaveTextContent("Mobile Shape: 9:16");
    // Centre (300, 300) and height 500 kept; 500 × 9 / 16 = 281.25 wide.
    const reshaped = { x: 160, y: 50, width: 281, height: 500 };
    expect(
      onSubmit.mock.calls[0][0].images.map((image) => image.mobileCrop),
    ).toEqual([reshaped, reshaped]);
  });

  it("has no Mobile Shape row while no image has a mobile crop", () => {
    renderEdit();

    expect(
      screen.queryByRole("button", { name: "Actions for mobile shape" }),
    ).not.toBeInTheDocument();
  });

  it("marks a stored mobile crop of another shape", () => {
    renderEdit({
      gallery: {
        ...GALLERY,
        images: GALLERY.images.map((image, index) => ({
          ...image,
          mobileCrop:
            index === 0
              ? { x: 0, y: 0, width: 400, height: 500 }
              : { x: 0, y: 0, width: 270, height: 480 },
        })),
      },
    });

    const images = screen.getByRole("list", { name: "Images" });
    expect(images.children[1]).toHaveTextContent(
      "Mobile crop is a different shape.",
    );
    expect(
      screen.getByText("Every mobile crop must be the same shape."),
    ).toBeInTheDocument();
    expect(button("Submit")).toBeDisabled();
  });
});

describe("GalleryForm cancel gate", () => {
  it("closes the first step at once", async () => {
    const { onClose } = renderCreate();

    pressEscape(dialog("Name your gallery"));

    expect(onClose).toHaveBeenCalled();
  });

  it("asks before cancelling from the details step, and Keep editing goes back", async () => {
    const { user, onClose } = renderCreate();
    await user.type(screen.getByLabelText("Gallery Name"), "Inside");
    await user.click(button("Next"));

    await user.click(button("Cancel"));
    expect(
      screen.getByText(
        "Are you sure you want to cancel creating this gallery?",
      ),
    ).toBeInTheDocument();
    await user.click(button("Keep editing"));

    expect(onClose).not.toHaveBeenCalled();
    expect(dialog("Gallery details")).toBeInTheDocument();
  });

  it("closes Edit at once while nothing has changed", async () => {
    const { user, onClose } = renderEdit();

    await user.click(button("Close"));

    expect(onClose).toHaveBeenCalled();
  });
});
