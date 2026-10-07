// Tests for PostForm, the Create a Post and Edit a Post form (docs/flows.md): the Website
// pre-select, the request payload (blank → null, numbers as numbers, ids only on existing items,
// no client key), what Edit leaves out, and backend errors including dropped item messages.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostForm, { postToFormValues } from "./PostForm";

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
  body: "We went for a walk.",
  postDate: "2026-10-07",
  active: true,
  createdAt: "2026-10-07T00:00:00.000Z",
  updatedAt: "2026-10-07T00:00:00.000Z",
  images: [IMAGE],
  links: [],
};

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
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("sends blank optional fields as null, sizes as numbers, the Active toggle, and no client key", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ...POST, postName: "Walk day" });
    const { user, onSuccess } = renderCreate({ onSubmit });
    await user.type(screen.getByLabelText("Post Name"), "  Walk day ");
    await user.type(screen.getByLabelText("Header"), "   ");
    await user.type(screen.getByLabelText("Body"), "We went for a walk.");
    await user.click(screen.getByRole("button", { name: "Add image" }));
    await user.type(
      screen.getByLabelText("Image URL"),
      "https://res.cloudinary.com/demo/one.jpg",
    );
    await user.type(screen.getByLabelText("Width"), "800");
    await user.type(screen.getByLabelText("Height"), "600");
    await user.type(screen.getByLabelText("Alt Text"), "Stevie");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByLabelText("Active"));

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      websiteId: "w1",
      postName: "Walk day",
      body: "We went for a walk.",
      header: null,
      subHeader: null,
      postDate: null,
      active: false,
      images: [
        {
          src: "https://res.cloudinary.com/demo/one.jpg",
          width: 800,
          height: 600,
          altText: "Stevie",
        },
      ],
      links: [],
    });
  });

  it("keeps Submit disabled while a saved image is invalid", async () => {
    const { user } = renderCreate();
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Body"), "Hi");
    await user.click(screen.getByRole("button", { name: "Add image" }));
    await user.type(
      screen.getByLabelText("Image URL"),
      "https://res.cloudinary.com/demo/one.jpg",
    );
    await user.type(screen.getByLabelText("Width"), "800");
    await user.type(screen.getByLabelText("Height"), "600");
    await user.type(screen.getByLabelText("Alt Text"), "Stevie");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();

    await user.clear(screen.getByLabelText("Width"));

    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("shows a backend error below Submit, its field messages next to fields, and keeps the input", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Please fix the highlighted fields.",
      fields: { postName: "Post name must be 100 characters or fewer." },
    });
    const { user, onSuccess } = renderCreate({ onSubmit });
    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.type(screen.getByLabelText("Body"), "Hi");

    await user.click(screen.getByRole("button", { name: "Submit" }));

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

  it("sends the full form: existing items keep their id, new items have none, no websiteId or active", async () => {
    const onSubmit = vi.fn().mockResolvedValue(POST);
    const { user } = renderEdit({ onSubmit });
    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.type(screen.getByLabelText("Link Name"), "Instagram");
    await user.type(
      screen.getByLabelText("URL"),
      "https://instagram.com/stevie",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      postName: "Walk day",
      body: "We went for a walk.",
      header: "A walk",
      subHeader: null,
      postDate: "2026-10-07",
      images: [
        {
          id: "i1",
          src: "https://res.cloudinary.com/demo/one.jpg",
          width: 800,
          height: 600,
          altText: "Stevie",
        },
      ],
      links: [{ name: "Instagram", url: "https://instagram.com/stevie" }],
    });
  });

  it("drops item messages from the server once deleting an item shifts the indexes", async () => {
    const post = {
      ...POST,
      images: [
        IMAGE,
        { ...IMAGE, id: "i2" },
        { ...IMAGE, id: "i3", altText: "Third" },
      ],
    };
    const onSubmit = vi.fn().mockRejectedValue({
      message: "Please fix the highlighted fields.",
      fields: {
        "images.1.altText": "Alt text must be 200 characters or fewer.",
      },
    });
    const { user } = renderEdit({ post, onSubmit });
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Alt text must be 200 characters or fewer.");

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(
      screen.queryByText("Alt text must be 200 characters or fewer."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Please fix the highlighted fields."),
    ).toBeInTheDocument();
  });
});

describe("postToFormValues", () => {
  it("turns nulls into empty strings and sizes into strings, keeping item ids as keys", () => {
    expect(postToFormValues(POST)).toEqual({
      postName: "Walk day",
      postDate: "2026-10-07",
      header: "A walk",
      subHeader: "",
      body: "We went for a walk.",
      images: [
        {
          key: "i1",
          id: "i1",
          src: "https://res.cloudinary.com/demo/one.jpg",
          width: "800",
          height: "600",
          altText: "Stevie",
        },
      ],
      links: [],
    });
  });
});
