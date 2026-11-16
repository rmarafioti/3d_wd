// A link to one of the landing page's sections: a plain hash link that, once the page has loaded,
// scrolls there with an eased scroll (instant with reduced motion), keeping the URL at "/", and
// moves focus to its heading.

"use client";

import { scrollToSection } from "../../_lib/landingSections";

export default function SectionLink({ id, onNavigate, className, children }) {
  function handleClick(event) {
    // A modified click (a new tab or window) keeps the browser's own behaviour.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onNavigate?.();
    scrollToSection(id);
  }

  return (
    <a href={`#${id}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
