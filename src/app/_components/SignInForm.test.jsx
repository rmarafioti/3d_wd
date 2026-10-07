// Tests for SignInForm (docs/flows.md → Login): the expired message, the "Signing in…" dialog,
// routing on the returned role, and the not-authorized message with its "contact us" link.
// Google's button is replaced by a plain button that hands back a credential.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInForm from "./SignInForm";
import { deferred, mockFetch, pressEscape } from "../../test/helpers";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }) => children,
  GoogleLogin: ({ onSuccess }) => (
    <button
      type="button"
      onClick={() => onSuccess({ credential: "google-id-token" })}
    >
      Sign in with Google
    </button>
  ),
}));

function setup({ expired = false } = {}) {
  const user = userEvent.setup();
  render(<SignInForm expired={expired} />);
  return { user };
}

describe("SignInForm", () => {
  it("shows the session-expired message only when expired is set", () => {
    const { unmount } = render(<SignInForm expired />);
    expect(
      screen.getByText("Your session expired, please sign in again."),
    ).toBeInTheDocument();
    unmount();

    render(<SignInForm expired={false} />);

    expect(
      screen.queryByText("Your session expired, please sign in again."),
    ).not.toBeInTheDocument();
  });

  it('sends the Google credential and shows "Signing in…" while waiting', async () => {
    const response = deferred();
    const { calls } = mockFetch({
      "POST /api/auth/login": () => response.promise,
    });
    const { user } = setup();

    await user.click(
      screen.getByRole("button", { name: "Sign in with Google" }),
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByText("Signing in…")).toBeInTheDocument();
    expect(calls[0].body).toEqual({ credential: "google-id-token" });
    response.resolve({ body: { data: { role: "admin" } } });
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
  });

  it.each([
    ["admin", "/admin"],
    ["site_owner", "/dashboard"],
  ])("routes a %s to %s", async (role, home) => {
    mockFetch({ "POST /api/auth/login": { body: { data: { role } } } });
    const { user } = setup();

    await user.click(
      screen.getByRole("button", { name: "Sign in with Google" }),
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(home));
  });

  it('shows the 401 message with a "contact us" mailto link and doesn\'t route', async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_CONTACT_EMAIL", "admin@3dwebdev.com");
    mockFetch({
      "POST /api/auth/login": {
        status: 401,
        body: { error: { message: "You are not authorized to log in." } },
      },
    });
    const { user } = setup();

    await user.click(
      screen.getByRole("button", { name: "Sign in with Google" }),
    );

    expect(
      await screen.findByText(/You are not authorized to log in\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "contact us" })).toHaveAttribute(
      "href",
      "mailto:admin@3dwebdev.com",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows other errors without the contact link", async () => {
    mockFetch({ "POST /api/auth/login": { networkError: true } });
    const { user } = setup();

    await user.click(
      screen.getByRole("button", { name: "Sign in with Google" }),
    );

    expect(
      await screen.findByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "contact us" }),
    ).not.toBeInTheDocument();
  });

  it('still shows the error when "Signing in…" was closed with Esc before the response', async () => {
    const response = deferred();
    mockFetch({ "POST /api/auth/login": () => response.promise });
    const { user } = setup();
    await user.click(
      screen.getByRole("button", { name: "Sign in with Google" }),
    );

    pressEscape(screen.getByRole("dialog"));
    response.resolve({
      status: 401,
      body: { error: { message: "You are not authorized to log in." } },
    });

    expect(
      await screen.findByText(/You are not authorized to log in\./),
    ).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("closes the dialog from its Close button, leaving the user on the page", async () => {
    mockFetch({
      "POST /api/auth/login": {
        status: 401,
        body: { error: { message: "You are not authorized to log in." } },
      },
    });
    const { user } = setup();
    await user.click(
      screen.getByRole("button", { name: "Sign in with Google" }),
    );
    await screen.findByText(/You are not authorized to log in\./);

    await user.click(
      screen.getByRole("button", { name: "Close", hidden: true }),
    );

    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute(
      "open",
    );
    expect(
      screen.getByRole("button", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
  });
});
