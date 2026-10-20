// Tests for PostForm, the Create a Post and Edit a Post form (docs/flows.md): the Website
// pre-select, the request payload (body elements in order, blank → null, numbers as numbers,
// image ids kept across a move, no client key), the one-paragraph rule, what Edit leaves out,
// and backend errors including dropped element messages.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostForm, { postToFormValues } from "./PostForm";
import { stubMatchMedia } from "../../test/helpers";

// The Add buttons read "Add a / an …" with none of that type and "Add another …" once there is
// one; the exact label is tested on its own in PostBodyFields.test.jsx.
const ADD_PARAGRAPH = /^Add (a|another) paragraph$/;
const ADD_IMAGE = /^Add (an|another) image$/;

const STEVIE = { id: "w1", websiteName: "Stevie The Dog", posts: [] };
const GOOD_BOYS = { id: "w2", websiteName: "Good Boys", posts: [] };
const IMAGE = {
  id: "i1",
  src: "https://res.cloudinary.com/demo/one.jpg",
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
  active: true,
  createdAt: "2026-10-07T00:00:00.000Z",
  updatedAt: "2026-10-07T00:00:00.000Z",
  body: [
    { type: "paragraph", text: "We went for a walk." },
    { type: "image", image: IMAGE },
  ],
};

// Fills the blank image element that "Add an image" appended.
async function fillImage(user) {
  await user.type(
    screen.getByLabelText("Image URL"),
    "https://res.cloudinary.com/demo/one.jpg",
  );
  await user.type(screen.getByLabelText("Width"), "800");
  await user.type(screen.getByLabelText("Height"), "600");
  await user.type(screen.getByLabelText("Alt Text"), "Stevie");
}

function renderCreate({ websites = [STEVIE], onSubmit = vi.fn() } = {}) {
  const onSuccess = vi.fn();
  const user = userEvent.setup();
  render(
    <PostForm
      mode="create"
      websites={websites}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      onClose={() => {}}
    />,
  );
  return { user, onSubmit, onSuccess };
}

function renderEdit({ post = POST, onSubmit = vi.fn() } = {}) {
  const onSuccess = vi.fn();
  const user = userEvent.setup();
  render(
    <PostForm
      mode="edit"
      websiteName={post.websiteName}
      initialValues={postToFormValues(post)}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      onClose={() => {}}
    />,
  );
  return { user, onSubmit, onSuccess };
}

describe("PostForm (create)", () => {
  it("pre-selects the website when the site owner has exactly one", () => {
    renderCreate();

    expect(screen.getByLabelText("Website")).toHaveDisplayValue(
      "Stevie The Dog",
    );
  });

  it("starts on the placeholder when there are several websites", () => {
    renderCreate({ websites: [STEVIE, GOOD_BOYS] });

    expect(screen.getByLabelText("Website")).toHaveDisplayValue(
      "Choose a website",
    );
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("sends the body in order, line breaks kept, blank optional fields as null, sizes as numbers, the Active toggle, and no client key", async () => {
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await user.type(screen.getByLabelText("Post Name"), "  Walk day ");
    await user.type(screen.getByLabelText("Header"), "   ");
    await user.type(
      screen.getByLabelText("Paragraph"),
      "  We went{Enter}for a walk. ",
    );
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user);
    await user.click(screen.getByRole("button", { name: ADD_PARAGRAPH }));
    await user.type(screen.getAllByLabelText("Paragraph")[1], "The end.");
    await user.click(screen.getByLabelText("Active"));

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      websiteId: "w1",
      postName: "Walk day",
      header: null,
      subHeader: null,
      postDate: null,
      active: false,
      body: [
        { type: "paragraph", text: "We went\nfor a walk." },
        {
          type: "image",
          image: {
            src: "https://res.cloudinary.com/demo/one.jpg",
            width: 800,
            height: 600,
            altText: "Stevie",
          },
        },
        { type: "paragraph", text: "The end." },
      ],
    });
  });

  it("keeps Publish disabled while the body has no paragraph", async () => {
    const { user } = renderCreate();
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Paragraph"), "Hi");
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user);
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();

    await user.click(
      screen.getByRole("button", { name: "Delete paragraph 1" }),
    );

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(
      screen.getByText("One paragraph is required to submit a post."),
    ).toBeInTheDocument();
  });

  it("keeps Publish disabled while an image is invalid", async () => {
    const { user } = renderCreate();
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Paragraph"), "Hi");
    await user.click(screen.getByRole("button", { name: ADD_IMAGE }));
    await fillImage(user);
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();

    await user.clear(screen.getByLabelText("Width"));

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("shows a backend error, its field messages next to fields, and keeps the input", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Please fix the highlighted fields.",
      fields: { postName: "Post name must be 100 characters or fewer." },
    });
    const { user, onSuccess } = renderCreate({ onSubmit });
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Paragraph"), "Hi");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText("Please fix the highlighted fields."),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Post Name").nextElementSibling,
    ).toHaveTextContent("Post name must be 100 characters or fewer.");
    expect(screen.getByLabelText("Post Name")).toHaveValue("Walk day");
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("PostForm (edit)", () => {
  it("pre-fills from the post with no Website select and no Active toggle", () => {
    renderEdit();

    expect(
      screen.getByRole("heading", { name: "Edit Post" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Website: Stevie The Dog")).toBeInTheDocument();
    expect(screen.queryByLabelText("Website")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Active")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Post Name")).toHaveValue("Walk day");
    expect(screen.getByLabelText("Sub Header")).toHaveValue("");
    expect(screen.getByLabelText("Width")).toHaveValue(800);
  });

  it("sends the full form: a moved image keeps its id, formatting as typed, no websiteId or active", async () => {
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderEdit({ onSubmit });
    await user.click(screen.getByRole("button", { name: "Move image 1 up" }));
    await user.clear(screen.getByLabelText("Paragraph"));
    await user.type(
      screen.getByLabelText("Paragraph"),
      "We went for a **walk**.",
    );

    await user.click(screen.getByRole("button", { name: "Publish" }));

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
            src: "https://res.cloudinary.com/demo/one.jpg",
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

    await user.click(screen.getByRole("button", { name: "Delete image 1" }));
    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].body).toEqual([
      { type: "paragraph", text: "We went for a walk." },
    ]);
  });

  it("drops the body's list-level server message once the body changes", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Please fix the highlighted fields.",
      fields: { body: "Add at least one paragraph." },
    });
    const { user } = renderEdit({ onSubmit });
    await user.click(screen.getByRole("button", { name: "Publish" }));
    await screen.findByText("Add at least one paragraph.");

    await user.click(screen.getByRole("button", { name: ADD_PARAGRAPH }));

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
    await user.click(screen.getByRole("button", { name: "Publish" }));
    await screen.findByText("Alt text must be 200 characters or fewer.");

    await user.click(screen.getByRole("button", { name: "Move image 1 up" }));

    expect(
      screen.queryByText("Alt text must be 200 characters or fewer."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Please fix the highlighted fields."),
    ).toBeInTheDocument();
  });
});

describe("PostForm preview", () => {
  function preview() {
    return screen.queryByRole("region", { name: "Post preview" });
  }

  async function fillPost(user) {
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Header"), "A walk");
    await user.type(
      screen.getByLabelText("Paragraph"),
      "We went for a **walk**.",
    );
  }

  const EXPECTED_PAYLOAD = {
    websiteId: "w1",
    postName: "Walk day",
    header: "A walk",
    subHeader: null,
    postDate: null,
    active: true,
    body: [{ type: "paragraph", text: "We went for a **walk**." }],
  };

  it("shows the post beside the form, with its formatting, as it is typed", async () => {
    const { user } = renderCreate();

    await fillPost(user);

    expect(
      within(preview()).getByRole("heading", { name: "A walk" }),
    ).toBeInTheDocument();
    expect(within(preview()).getByText(/We went for a/)).toContainHTML(
      "We went for a <b>walk</b>.",
    );
  });

  it("starts open on desktop, and its toggle hides it and shows it again", async () => {
    const { user } = renderCreate();
    const toggle = screen.getByRole("button", { name: "Preview" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(preview()).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(preview()).not.toBeInTheDocument();

    await user.click(toggle);
    expect(preview()).toBeInTheDocument();
  });

  it("has a single Publish button on desktop, under the form, with the preview open or hidden", async () => {
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await fillPost(user);
    expect(screen.getAllByRole("button", { name: "Publish" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getAllByRole("button", { name: "Publish" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(EXPECTED_PAYLOAD);
  });

  it("shows a backend error once, under Publish, with the preview open", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Something went wrong, please try again.",
    });
    const { user } = renderCreate({ onSubmit });
    await fillPost(user);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findAllByText("Something went wrong, please try again."),
    ).toHaveLength(1);
  });

  it("on a phone, swaps the form for the preview and back, keeping everything typed", async () => {
    stubMatchMedia(true);
    const { user } = renderCreate();
    await fillPost(user);
    expect(preview()).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      within(preview()).getByRole("heading", { name: "A walk" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Post Name")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Back to edit" }));

    expect(preview()).not.toBeInTheDocument();
    expect(screen.getByLabelText("Post Name")).toBeVisible();
    expect(screen.getByLabelText("Post Name")).toHaveValue("Walk day");
  });

  it("on a phone, publishes from the preview view", async () => {
    stubMatchMedia(true);
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user, onSuccess } = renderCreate({ onSubmit });
    await fillPost(user);
    await user.click(screen.getByRole("button", { name: "Preview" }));

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(EXPECTED_PAYLOAD);
  });
});
