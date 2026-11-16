// The landing page's linked sections, read by the page (their ids) and the Navbar (their labels),
// and the scrolls its links and Back to top make: smooth, or instant when reduced motion is asked.

// Each linked section's id, by name, so the page sets each on its own section whatever the links'
// order.
export const SECTION_IDS = {
  pricing: "pricing",
  about: "about",
  contact: "contact",
};

// The Navbar's section links, in their order.
export const LANDING_SECTIONS = [
  { id: SECTION_IDS.pricing, label: "Pricing" },
  { id: SECTION_IDS.about, label: "About Me" },
  { id: SECTION_IDS.contact, label: "Contact Me" },
];

// The skip link's target: the page's main content, past both navbar rows.
export const MAIN_CONTENT_ID = "main-content";

function scrollBehavior() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

// Focus moves to the section's heading, so Tab continues from there. preventScroll keeps the
// focus from cutting the smooth scroll short with a jump of its own.
export function scrollToSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  section.scrollIntoView({ behavior: scrollBehavior() });
  // The URL and Back behave as the plain hash link did.
  window.history.pushState(null, "", `#${id}`);
  section.querySelector("h2")?.focus({ preventScroll: true });
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
  document
    .querySelector(`#${MAIN_CONTENT_ID} h1`)
    ?.focus({ preventScroll: true });
}
