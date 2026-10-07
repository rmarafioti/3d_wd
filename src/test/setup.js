// Test setup, run before every test file: jest-dom matchers, RTL cleanup, and the parts of
// <dialog> that jsdom doesn't implement.

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// jsdom has no showModal() or close(). This covers what our dialogs rely on: the open
// attribute, showModal() throwing on an already-open dialog (as browsers do), and the close
// event that React's onClose listens for.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function showModal() {
    if (this.open) {
      throw new DOMException(
        "The dialog is already open.",
        "InvalidStateError",
      );
    }
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.open) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
