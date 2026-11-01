// Tests for PostForm, Create a Post and Edit a Post as a run of dialogs (docs/flows.md → Create a
// Post): the steps (Website only with several websites, Next and Insert disabled until valid), the
// cancel gate, the review view's Add button limits and its toolbar (moves where an element can
// move, no Delete on the only paragraph, Add on an empty optional field, edits that only change
// the post on Insert / Save, a cancelled image edit keeping the post's image), Edit opening on the
// review view, the request payload (body in order, blank → null, image ids kept across a move, no
// client key), backend errors on their toolbar rows and dropped once the body shifts, image
// uploads on Submit (docs/api.md → Endpoints, Notes: each file shrunk, one signature, each new file
// to Cloudinary, nothing saved if one fails, no second upload on a retry), the progress dialog and
// the 20-hour form timeout.

import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostForm, { postToFormValues } from "./PostForm";
import {
  deferred,
  imageFile,
  mockFetch,
  pressEscape,
  stubImageLoading,
  stubImageShrinking,
  stubObjectUrls,
} from "../../test/helpers";

const STEVIE = { id: "w1", websiteName: "Stevie The Dog", posts: [] };
const GOOD_BOYS = { id: "w2", websiteName: "Good Boys", posts: [] };
const FOLDER_URL =
  "https://res.cloudinary.com/demo/image/upload/v1792541844/3dwd-dev/steviethedog";
const IMAGE = {
  id: "i1",
  src: `${FOLDER_URL}/stored0.jpg`,
  width: 800,
  height: 600,
  altText: "Stevie",
};
const POST = {
  id: "p1",
  websiteId: "w1",
  websiteName: "Stevie The Dog",
  postName: "Walk day",
  header: "A walk",
  subHeader: null,
  postDate: "2026-10-07",
  status: "published",
  createdAt: "2026-10-07T00:00:00.000Z",
  updatedAt: "2026-10-07T00:00:00.000Z",
  body: [
    { type: "paragraph", text: "We went for a walk." },
    { type: "image", image: IMAGE },
  ],
};

// The UploadSignature the sign endpoint returns (docs/api.md → Shapes), with Cloudinary's own
// field names.
const UPLOAD_URL = "https://api.cloudinary.com/v1_1/demo/image/upload";
const SIGNATURE = {
  uploadUrl: UPLOAD_URL,
  fields: {
    allowed_formats: "jpg,jpeg,png,webp",
    folder: "3dwd-dev/steviethedog",
    timestamp: 1792541844,
    transformation: "c_limit,w_2500,h_2500",
    signature: "0a1b2c",
    api_key: "123456",
  },
};

// Cloudinary's answer for the nth upload: the stored image (it also sends fields we don't read).
function stored(n) {
  return {
    body: {
      secure_url: `${FOLDER_URL}/stored${n}.jpg`,
      width: 2500,
      height: 1875,
      public_id: `3dwd-dev/steviethedog/stored${n}`,
      format: "jpg",
    },
  };
}

// The sign endpoint and Cloudinary, answering uploads in order. Returns mockFetch's calls.
function mockUploads(uploads = [stored(1), stored(2)]) {
  return mockFetch({
    "POST /api/siteOwner/uploads/sign": { body: { data: SIGNATURE } },
    [`POST ${UPLOAD_URL}`]: uploads,
  }).calls;
}

function uploadCalls(calls) {
  return calls.filter((call) => call.path === UPLOAD_URL);
}

function dialog(title) {
  return screen.getByRole("dialog", { name: title });
}

function button(name, container = document.body) {
  return within(container).getByRole("button", { name });
}

function preview() {
  return screen.getByRole("region", { name: "Post preview" });
}

function toolbar() {
  return screen.getByRole("region", { name: "Post contents" });
}

// The toolbar rows' text, top to bottom: the post's own fields, then the body list's rows (not an
// open menu's items).
function toolbarRows() {
  const [fields] = within(toolbar()).getAllByRole("list");
  const body = within(toolbar()).getByRole("list", { name: "Body" });
  return [...fields.children, ...body.children].map((row) => row.textContent);
}

// Opens a toolbar row's ⋮ menu and returns the menu's item names.
async function openMenu(user, rowName) {
  await user.click(button(`Actions for ${rowName}`));
  const list = button(`Actions for ${rowName}`).nextElementSibling;
  return within(list)
    .getAllByRole("button")
    .map((item) => item.getAttribute("aria-label") ?? item.textContent);
}

async function pickFromMenu(user, rowName, item) {
  await user.click(button(`Actions for ${rowName}`));
  await user.click(button(item, toolbar()));
}

function renderCreate({ websites = [STEVIE], onSubmit = vi.fn() } = {}) {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <PostForm
      mode="create"
      websites={websites}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      onClose={onClose}
    />,
  );
  return { user, onSubmit, onSuccess, onClose, unmount: view.unmount };
}

function renderEdit({ post = POST, onSubmit = vi.fn() } = {}) {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <PostForm
      mode="edit"
      websiteId={post.websiteId}
      initialValues={postToFormValues(post)}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      onClose={onClose}
    />,
  );
  return { user, onSubmit, onSuccess, onClose };
}

// Walks Create's steps to the review view.
async function walkSteps(
  user,
  { postName = "Walk day", header = "", paragraph = "Hi" } = {},
) {
  await user.type(screen.getByLabelText("Post Name"), postName);
  await user.click(button("Next"));
  if (header) await user.type(screen.getByLabelText("Header"), header);
  await user.click(button("Next"));
  await user.type(screen.getByLabelText("Paragraph"), paragraph);
  await user.click(button("Insert"));
}

// From the review view: Add Image, pick a file and let it load, write its alt text, Insert.
async function addImage(user, loads, altText = "Stevie") {
  await user.click(button("Add Image"));
  const imageDialog = dialog("Add an image");
  await user.upload(
    within(imageDialog).getByLabelText("Image"),
    imageFile(`${altText}.jpg`),
  );
  loads.at(-1).load(4000, 3000);
  await user.type(within(imageDialog).getByLabelText("Alt Text"), altText);
  await user.click(button("Insert", imageDialog));
}

async function addParagraph(user, text) {
  await user.click(button("Add Paragraph"));
  const paragraphDialog = dialog("Add a paragraph");
  await user.type(within(paragraphDialog).getByLabelText("Paragraph"), text);
  await user.click(button("Insert", paragraphDialog));
}

describe("PostForm (create) steps", () => {
  it("starts on the Post Name alone for a site owner with one website, with Next disabled until it is filled", async () => {
    const { user } = renderCreate();
    expect(dialog("Name your post")).toBeInTheDocument();
    expect(screen.queryByLabelText("Website")).not.toBeInTheDocument();
    expect(button("Next")).toBeDisabled();

    await user.type(screen.getByLabelText("Post Name"), "Walk day");

    expect(button("Next")).toBeEnabled();
    expect(screen.getByLabelText("Post Name")).toHaveAccessibleDescription(
      "8 / 100",
    );
  });

  it("asks for the website above the Post Name when there are several", async () => {
    const { user } = renderCreate({ websites: [STEVIE, GOOD_BOYS] });
    expect(screen.getByLabelText("Website")).toHaveDisplayValue(
      "Choose a website",
    );
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    expect(button("Next")).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Website"), "Good Boys");

    expect(button("Next")).toBeEnabled();
  });

  it("walks Post Name, the optional details and the first paragraph into the review view", async () => {
    const { user } = renderCreate();
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.click(button("Next"));
    expect(dialog("Post details")).toHaveTextContent(
      "*These fields are optional.",
    );
    expect(button("Next")).toBeEnabled();
    await user.type(screen.getByLabelText("Header"), "A walk");
    await user.click(button("Next"));
    expect(dialog("Write your first paragraph")).toHaveTextContent(
      "*One paragraph is required for a post.",
    );
    expect(button("Insert")).toBeDisabled();

    await user.type(
      screen.getByLabelText("Paragraph"),
      "We went for a **walk**.",
    );
    await user.click(button("Insert"));

    expect(dialog("Create a Post")).toBeInTheDocument();
    expect(
      within(preview()).getByRole("heading", { name: "A walk" }),
    ).toBeInTheDocument();
    expect(within(preview()).getByText(/We went for a/)).toContainHTML(
      "We went for a <b>walk</b>.",
    );
    expect(toolbarRows()).toEqual([
      "Post Name: Walk day",
      "No date",
      "Header: A walk",
      "No sub header",
      "We went for a walk.",
    ]);
  });

  it("has an X only on the review view; its smaller dialogs have Cancel instead", async () => {
    const { user } = renderCreate();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
    await walkSteps(user);
    expect(button("Close", dialog("Create a Post"))).toBeInTheDocument();

    await user.click(button("Add Paragraph"));

    expect(
      within(dialog("Add a paragraph")).queryByRole("button", {
        name: "Close",
      }),
    ).not.toBeInTheDocument();
    expect(button("Cancel", dialog("Add a paragraph"))).toBeInTheDocument();
  });

  it("asks before cancelling when the review view's X is pressed", async () => {
    const { user, onClose } = renderCreate();
    await walkSteps(user);

    await user.click(button("Close"));

    expect(
      screen.getByText("Are you sure you want to cancel this post?"),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes from the first step without asking", async () => {
    const { user, onClose } = renderCreate();
    await user.type(screen.getByLabelText("Post Name"), "Walk day");

    await user.click(button("Cancel"));

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText(/Are you sure/)).not.toBeInTheDocument();
  });

  it("asks before cancelling from the second step on, and Keep editing keeps everything", async () => {
    const { user, onClose } = renderCreate();
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.click(button("Next"));
    await user.type(screen.getByLabelText("Header"), "A walk");

    await user.click(button("Cancel"));
    expect(
      screen.getByText("Are you sure you want to cancel this post?"),
    ).toBeInTheDocument();
    await user.click(button("Keep editing"));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Header")).toHaveValue("A walk");
    await user.click(button("Cancel"));
    await user.click(button("Yes, cancel post"));
    expect(onClose).toHaveBeenCalled();
  });

  it("asks before cancelling when Esc is pressed on the review view", async () => {
    const { user, onClose } = renderCreate();
    await walkSteps(user);

    pressEscape(dialog("Create a Post"));

    expect(
      await screen.findByText("Are you sure you want to cancel this post?"),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog("Create a Post")).toHaveAttribute("open");
  });
});

describe("PostForm (create) review view", () => {
  it("sends the body in order, line breaks kept, blank optional fields as null, the status from its toggle, and no client key", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    mockUploads();
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await user.type(screen.getByLabelText("Post Name"), "  Walk day ");
    await user.click(button("Next"));
    await user.type(screen.getByLabelText("Header"), "   ");
    await user.click(button("Next"));
    await user.type(
      screen.getByLabelText("Paragraph"),
      "  We went{Enter}for a walk. ",
    );
    await user.click(button("Insert"));
    await addImage(user, loads);
    await addParagraph(user, "The end.");
    await user.click(screen.getByLabelText("Published"));

    await user.click(button("Submit"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      websiteId: "w1",
      postName: "Walk day",
      header: null,
      subHeader: null,
      postDate: null,
      status: "draft",
      body: [
        { type: "paragraph", text: "We went\nfor a walk." },
        {
          type: "image",
          image: {
            src: `${FOLDER_URL}/stored1.jpg`,
            width: 2500,
            height: 1875,
            altText: "Stevie",
          },
        },
        { type: "paragraph", text: "The end." },
      ],
    });
  });

  it("keeps Insert disabled until an image has a file and alt text", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { user } = renderCreate();
    await walkSteps(user);
    await user.click(button("Add Image"));
    const imageDialog = dialog("Add an image");
    expect(button("Insert", imageDialog)).toBeDisabled();

    await user.upload(
      within(imageDialog).getByLabelText("Image"),
      imageFile("dog.jpg"),
    );
    loads.at(-1).load(800, 600);
    expect(
      await within(imageDialog).findByText(
        "*Alt text is required to insert the image.",
      ),
    ).toBeInTheDocument();
    expect(button("Insert", imageDialog)).toBeDisabled();
    await user.type(within(imageDialog).getByLabelText("Alt Text"), "Stevie");

    expect(button("Insert", imageDialog)).toBeEnabled();
  });

  it("adds nothing when an Add dialog is cancelled, without asking", async () => {
    const { user, onClose } = renderCreate();
    await walkSteps(user);
    await user.click(button("Add Paragraph"));
    await user.type(
      within(dialog("Add a paragraph")).getByLabelText("Paragraph"),
      "Not this.",
    );

    await user.click(button("Cancel", dialog("Add a paragraph")));

    expect(
      screen.queryByRole("dialog", { name: "Add a paragraph" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Are you sure/)).not.toBeInTheDocument();
    expect(toolbarRows()).toHaveLength(5);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("offers only Add on an empty optional field, and Delete empties a filled one", async () => {
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderCreate({ onSubmit });
    await walkSteps(user, { header: "A walk" });
    expect(await openMenu(user, "sub header")).toEqual(["Add"]);
    expect(await openMenu(user, "header")).toEqual(["Edit", "Delete"]);

    await user.click(button("Delete", toolbar()));
    await user.click(button("Submit"));

    expect(toolbarRows()[2]).toBe("No header");
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].header).toBeNull();
  });

  it("changes a field only on Save, from its own dialog", async () => {
    const { user } = renderCreate();
    await walkSteps(user);
    await pickFromMenu(user, "sub header", "Add");
    const subHeaderDialog = dialog("Add sub header");
    await user.type(
      within(subHeaderDialog).getByLabelText("Sub Header"),
      "Sunny",
    );
    expect(toolbarRows()[3]).toBe("No sub header");

    await user.click(button("Save", subHeaderDialog));

    expect(toolbarRows()[3]).toBe("Sub Header: Sunny");
    expect(within(preview()).getByText("Sunny")).toBeInTheDocument();
  });

  it("disables Add Paragraph and Add Image at 5 of each, with the limits as text", () => {
    const paragraphs = Array.from({ length: 5 }, (_, i) => ({
      type: "paragraph",
      text: `Paragraph ${i}`,
    }));
    const images = Array.from({ length: 5 }, (_, i) => ({
      type: "image",
      image: { ...IMAGE, id: `i${i}` },
    }));
    renderEdit({ post: { ...POST, body: [...paragraphs, ...images] } });

    expect(button("Add Paragraph")).toBeDisabled();
    expect(button("Add Image")).toBeDisabled();
    expect(screen.getByText("Maximum of 5 paragraphs")).toBeInTheDocument();
    expect(screen.getByText("Maximum of 5 images")).toBeInTheDocument();
  });
});

describe("PostForm toolbar moves and deletes", () => {
  it('lists the body under its own "Body" heading, apart from the post\'s fields', () => {
    renderEdit();

    const body = within(toolbar()).getByRole("list", { name: "Body" });
    expect(
      within(toolbar()).getByRole("heading", { name: "Body" }),
    ).toBeInTheDocument();
    expect(Array.from(body.children).map((row) => row.textContent)).toEqual([
      "We went for a walk.",
      "Stevie",
    ]);
  });

  it("offers a move only where an element can go, and Delete on everything but the only paragraph", async () => {
    const { user } = renderEdit();

    expect(await openMenu(user, "paragraph 1")).toEqual([
      "Edit",
      "Move paragraph 1 down",
    ]);
    expect(await openMenu(user, "image 1")).toEqual([
      "Edit",
      "Move image 1 up",
      "Delete",
    ]);
  });

  it("moves an element in the toolbar and the preview together, keeping the menu open", async () => {
    const { user } = renderEdit();
    await user.click(button("Actions for image 1"));

    await user.click(button("Move image 1 up"));

    // The image's row, still showing its open menu, now comes first.
    const [imageRow, paragraphRow] = toolbarRows().slice(4);
    expect(imageRow).toMatch(/^Stevie/);
    expect(paragraphRow).toBe("We went for a walk.");
    const previewImage = within(preview()).getByRole("img", { name: "Stevie" });
    expect(previewImage.nextElementSibling).toHaveTextContent(
      "We went for a walk.",
    );
    expect(button("Actions for image 1")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(button("Move image 1 down")).toBeInTheDocument();
  });

  it("offers Delete on a paragraph once there is a second one", async () => {
    const { user } = renderEdit();
    await addParagraph(user, "The end.");

    expect(await openMenu(user, "paragraph 1")).toContain("Delete");
  });
});

describe("PostForm image edits", () => {
  it("keeps the post's image when an image edit is cancelled, and lets go of it once replaced", async () => {
    const loads = stubImageLoading();
    const { revokeObjectURL } = stubObjectUrls();
    const { user } = renderCreate();
    await walkSteps(user);
    await addImage(user, loads);

    await pickFromMenu(user, "image 1", "Edit");
    await user.upload(
      within(dialog("Edit image")).getByLabelText("Image"),
      imageFile("other.jpg"),
    );
    loads.at(-1).load(800, 600);
    await user.click(button("Cancel", dialog("Edit image")));

    expect(revokeObjectURL.mock.calls).toEqual([["blob:test/2"]]);
    expect(
      within(preview()).getByRole("img", { name: "Stevie" }),
    ).toHaveAttribute("src", "blob:test/1");

    await pickFromMenu(user, "image 1", "Edit");
    await user.upload(
      within(dialog("Edit image")).getByLabelText("Image"),
      imageFile("other.jpg"),
    );
    loads.at(-1).load(800, 600);
    await user.click(button("Insert", dialog("Edit image")));

    expect(revokeObjectURL).toHaveBeenLastCalledWith("blob:test/1");
    expect(
      within(preview()).getByRole("img", { name: "Stevie" }),
    ).toHaveAttribute("src", "blob:test/3");
  });
});

describe("PostForm (edit)", () => {
  it("opens on the review view with the post loaded, and no Website or Published switch", () => {
    renderEdit();

    expect(dialog("Edit Post")).toBeInTheDocument();
    expect(screen.queryByLabelText("Website")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Published")).not.toBeInTheDocument();
    expect(toolbarRows()).toEqual([
      "Post Name: Walk day",
      "Post Date: 2026-10-07",
      "Header: A walk",
      "No sub header",
      "We went for a walk.",
      "Stevie",
    ]);
    expect(
      within(preview()).getByRole("img", { name: "Stevie" }),
    ).toHaveAttribute("src", IMAGE.src);
  });

  it("closes without asking before anything changes, and asks once something has", async () => {
    const { user, onClose } = renderEdit();
    await user.click(button("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);

    await pickFromMenu(user, "header", "Delete");
    await user.click(button("Close"));

    expect(
      screen.getByText("Are you sure you want to cancel your changes?"),
    ).toBeInTheDocument();
    expect(button("Discard changes")).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sends the full form: a moved image keeps its id, formatting as typed, no websiteId or status", async () => {
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderEdit({ onSubmit });
    await user.click(button("Actions for image 1"));
    await user.click(button("Move image 1 up"));
    await pickFromMenu(user, "paragraph 1", "Edit");
    const paragraph = within(dialog("Edit paragraph")).getByLabelText(
      "Paragraph",
    );
    await user.clear(paragraph);
    await user.type(paragraph, "We went for a **walk**.");
    await user.click(button("Insert", dialog("Edit paragraph")));

    await user.click(button("Submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      postName: "Walk day",
      header: "A walk",
      subHeader: null,
      postDate: "2026-10-07",
      body: [
        {
          type: "image",
          image: {
            id: "i1",
            src: IMAGE.src,
            width: 800,
            height: 600,
            altText: "Stevie",
          },
        },
        { type: "paragraph", text: "We went for a **walk**." },
      ],
    });
  });

  it("leaves a deleted image out of the body", async () => {
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderEdit({ onSubmit });

    await pickFromMenu(user, "image 1", "Delete");
    await user.click(button("Submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].body).toEqual([
      { type: "paragraph", text: "We went for a walk." },
    ]);
  });

  it("shows a backend error under Submit and its field messages under their toolbar rows", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Please fix the highlighted fields.",
      fields: {
        postName: "Post name must be 100 characters or fewer.",
        "body.1.image.altText": "Alt text must be 200 characters or fewer.",
      },
    });
    const { user, onSuccess } = renderEdit({ onSubmit });

    await user.click(button("Submit"));

    expect(
      await screen.findByText("Please fix the highlighted fields."),
    ).toBeInTheDocument();
    const rows = within(toolbar()).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent(
      "Post name must be 100 characters or fewer.",
    );
    expect(rows[5]).toHaveTextContent(
      "Alt text must be 200 characters or fewer.",
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("drops the body's list-level server message once the body changes", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Please fix the highlighted fields.",
      fields: { body: "Add at least one paragraph." },
    });
    const { user } = renderEdit({ onSubmit });
    await user.click(button("Submit"));
    await screen.findByText("Add at least one paragraph.");

    await addParagraph(user, "More.");

    expect(
      screen.queryByText("Add at least one paragraph."),
    ).not.toBeInTheDocument();
  });

  it("drops element messages from the server once moving an element shifts the indexes", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Please fix the highlighted fields.",
      fields: {
        "body.1.image.altText": "Alt text must be 200 characters or fewer.",
      },
    });
    const { user } = renderEdit({ onSubmit });
    await user.click(button("Submit"));
    await screen.findByText("Alt text must be 200 characters or fewer.");

    await user.click(button("Actions for image 1"));
    await user.click(button("Move image 1 up"));

    expect(
      screen.queryByText("Alt text must be 200 characters or fewer."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Please fix the highlighted fields."),
    ).toBeInTheDocument();
  });
});

describe("PostForm image uploads", () => {
  it("signs once for the post's website, uploads each new image to Cloudinary, then saves Cloudinary's src and size", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const { decodes, encodes } = stubImageShrinking({
      width: 4000,
      height: 3000,
    });
    const calls = mockUploads();
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await walkSteps(user);
    await addImage(user, loads, "Stevie");
    await addImage(user, loads, "Ball");

    await user.click(button("Submit"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const [sign, ...uploads] = calls;
    expect(sign).toMatchObject({
      method: "POST",
      path: "/api/siteOwner/uploads/sign",
      credentials: "include",
      headers: { "X-CSRF-Protection": "1" },
      body: { websiteId: "w1" },
    });
    expect(uploads).toHaveLength(2);
    for (const upload of uploads) {
      expect(upload.credentials).toBeUndefined();
      expect(upload.headers).toEqual({});
      expect(upload.body).toEqual({
        ...SIGNATURE.fields,
        timestamp: "1792541844",
        file: expect.any(File),
      });
    }
    // Each picked file is shrunk to fit 2500 px before it goes up.
    expect(uploads.map((upload) => upload.body.file.name)).toEqual([
      "Stevie.jpg",
      "Ball.jpg",
    ]);
    expect(encodes).toEqual([
      expect.objectContaining({ width: 2500, height: 1875 }),
      expect.objectContaining({ width: 2500, height: 1875 }),
    ]);
    expect(uploads.map((upload) => upload.body.file)).not.toContain(
      decodes[0].file,
    );
    expect(onSubmit.mock.calls[0][0].body.slice(1)).toEqual([
      {
        type: "image",
        image: {
          src: `${FOLDER_URL}/stored1.jpg`,
          width: 2500,
          height: 1875,
          altText: "Stevie",
        },
      },
      {
        type: "image",
        image: {
          src: `${FOLDER_URL}/stored2.jpg`,
          width: 2500,
          height: 1875,
          altText: "Ball",
        },
      },
    ]);
  });

  it("shows a picked image in the preview from memory before anything is uploaded", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const calls = mockUploads();
    const { user } = renderCreate();
    await walkSteps(user);

    await addImage(user, loads);

    expect(
      within(preview()).getByRole("img", { name: "Stevie" }),
    ).toHaveAttribute("src", "blob:test/1");
    expect(calls).toHaveLength(0);
  });

  it("in Edit, uploads only the added image and keeps the existing one's id, src and size", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const calls = mockUploads();
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderEdit({ onSubmit });
    await addImage(user, loads, "Ball");

    await user.click(button("Submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(calls[0].body).toEqual({ websiteId: "w1" });
    expect(uploadCalls(calls)).toHaveLength(1);
    expect(onSubmit.mock.calls[0][0].body.slice(1)).toEqual([
      { type: "image", image: IMAGE },
      {
        type: "image",
        image: {
          src: `${FOLDER_URL}/stored1.jpg`,
          width: 2500,
          height: 1875,
          altText: "Ball",
        },
      },
    ]);
  });

  it("sends no request before the save when the body has no new images", async () => {
    const calls = mockUploads();
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderEdit({ onSubmit });

    await user.click(button("Submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(calls).toHaveLength(0);
  });

  it.each([
    [
      "Cloudinary refuses it",
      {
        status: 400,
        body: { error: { message: "Image file format gif not allowed" } },
      },
    ],
    ["Cloudinary can't be reached", { networkError: true }],
  ])("saves nothing and keeps the post when %s", async (_, failure) => {
    const loads = stubImageLoading();
    stubObjectUrls();
    mockUploads([failure]);
    const onSubmit = vi.fn();
    const { user } = renderCreate({ onSubmit });
    await walkSteps(user);
    await addImage(user, loads);

    await user.click(button("Submit"));

    expect(
      await screen.findByText(
        "Your images couldn't be uploaded, please try again.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Image file format gif not allowed"),
    ).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toolbarRows()[0]).toBe("Post Name: Walk day");
    expect(button("Submit")).toBeEnabled();
  });

  it("shows the sign endpoint's error and uploads nothing", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const calls = mockFetch({
      "POST /api/siteOwner/uploads/sign": {
        status: 404,
        body: { error: { message: "Website not found." } },
      },
    }).calls;
    const onSubmit = vi.fn();
    const { user } = renderCreate({ onSubmit });
    await walkSteps(user);
    await addImage(user, loads);

    await user.click(button("Submit"));

    expect(await screen.findByText("Website not found.")).toBeInTheDocument();
    expect(uploadCalls(calls)).toHaveLength(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the upload-signing rate-limit message, uploads nothing and saves nothing", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const calls = mockFetch({
      "POST /api/siteOwner/uploads/sign": {
        status: 429,
        body: {
          error: { message: "Too many requests. Please try again later." },
        },
      },
    }).calls;
    const onSubmit = vi.fn();
    const { user } = renderCreate({ onSubmit });
    await walkSteps(user);
    await addImage(user, loads);

    await user.click(button("Submit"));

    expect(
      await screen.findByText("Too many requests. Please try again later."),
    ).toBeInTheDocument();
    expect(uploadCalls(calls)).toHaveLength(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("doesn't upload an image again when Submit is tried again after a failed save", async () => {
    const loads = stubImageLoading();
    const { revokeObjectURL } = stubObjectUrls();
    const calls = mockUploads();
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce({
        message: "Something went wrong, please try again.",
      })
      .mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await walkSteps(user);
    await addImage(user, loads);
    await user.click(button("Submit"));
    await screen.findByText("Something went wrong, please try again.");

    await user.click(button("Submit"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(uploadCalls(calls)).toHaveLength(1);
    expect(onSubmit.mock.calls[1][0].body[1].image.src).toBe(
      `${FOLDER_URL}/stored1.jpg`,
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });

  it("shows each step of Submit in a progress dialog: preparing, uploading as each upload finishes, then saving", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const sign = deferred();
    const first = deferred();
    const second = deferred();
    mockFetch({
      "POST /api/siteOwner/uploads/sign": () => sign.promise,
      [`POST ${UPLOAD_URL}`]: [() => first.promise, () => second.promise],
    });
    const save = deferred();
    const { user } = renderCreate({
      onSubmit: vi.fn().mockReturnValue(save.promise),
    });
    await walkSteps(user);
    await addImage(user, loads, "Stevie");
    await addImage(user, loads, "Ball");

    await user.click(button("Submit"));

    expect(
      await screen.findByRole("dialog", { name: "Preparing photos…" }),
    ).toBeInTheDocument();
    expect(button("Submit")).toBeDisabled();
    await act(async () => sign.resolve({ body: { data: SIGNATURE } }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Uploading photos (0 of 2)…",
    );
    await act(async () => first.resolve(stored(1)));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Uploading photos (1 of 2)…",
    );
    await act(async () => second.resolve(stored(2)));
    expect(screen.getByRole("status")).toHaveTextContent("Saving your post…");
  });

  it("can't be dismissed with Esc while Submit runs", async () => {
    const save = deferred();
    const { user } = renderCreate({
      onSubmit: vi.fn().mockReturnValue(save.promise),
    });
    await walkSteps(user);
    await user.click(button("Submit"));
    const progress = await screen.findByRole("dialog", {
      name: "Saving your post…",
    });

    pressEscape(progress);

    expect(progress).toHaveAttribute("open");
  });

  it('goes straight to "Saving your post…" without new images, and on a failure closes the dialog and shows the error under Submit', async () => {
    const save = deferred();
    const { user } = renderCreate({
      onSubmit: vi.fn().mockReturnValue(save.promise),
    });
    await walkSteps(user);

    await user.click(button("Submit"));

    expect(
      await screen.findByRole("dialog", { name: "Saving your post…" }),
    ).toBeInTheDocument();
    await act(async () =>
      save.reject({ message: "Something went wrong, please try again." }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(button("Submit")).toBeEnabled();
    expect(
      screen.getByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
    expect(toolbarRows()[0]).toBe("Post Name: Walk day");
  });

  it("keeps the progress dialog closed after a failed upload, even as another upload finishes", async () => {
    const loads = stubImageLoading();
    stubObjectUrls();
    const second = deferred();
    mockUploads([{ networkError: true }, () => second.promise]);
    const { user } = renderCreate({ onSubmit: vi.fn() });
    await walkSteps(user);
    await addImage(user, loads, "Stevie");
    await addImage(user, loads, "Ball");
    await user.click(button("Submit"));
    await screen.findByText(
      "Your images couldn't be uploaded, please try again.",
    );

    await act(async () => second.resolve(stored(2)));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("lets go of picked images' object URLs when the form closes", async () => {
    const loads = stubImageLoading();
    const { revokeObjectURL } = stubObjectUrls();
    const { user, unmount } = renderCreate();
    await walkSteps(user);
    await addImage(user, loads);

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });
});

describe("PostForm timeout", () => {
  const HOUR = 60 * 60 * 1000;

  it("clears the form with the timed-out message once it has been open for 20 hours", () => {
    vi.useFakeTimers();
    try {
      renderCreate();

      act(() => vi.advanceTimersByTime(20 * HOUR - 60 * 1000));
      expect(screen.getByLabelText("Post Name")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(60 * 1000));

      expect(
        screen.getByText(
          "This form was open for 20 hours, so it timed out. Nothing was saved. Please open it again.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("Post Name")).not.toBeInTheDocument();
      expect(button("Close")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
