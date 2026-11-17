// The landing page's linked sections, read by the page (their ids) and the Navbar (their labels),
// and the scrolls its links and Back to top make: an eased scroll, or instant when reduced motion
// is asked.

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

// The scroll's length grows with its distance, so a short hop isn't sluggish and a long one
// isn't a blur. Slower than the browser's own smooth scroll, whose length can't be set.
const MIN_SCROLL_MS = 850;
const MAX_SCROLL_MS = 1400;
const PX_PER_EXTRA_MS = 5;

// The visitor taking over the scroll stops the animation, so it never fights them.
const INTERRUPTING_EVENTS = ["wheel", "touchstart", "keydown"];

// The stop of the scroll still running, so a second click starts afresh.
let stopRunningScroll = null;

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeInOutCubic(progress) {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

// The element's top in the page, from offsetTop, which a section still fading up (translateY)
// doesn't shift, as getBoundingClientRect would.
function pageTop(element) {
  let top = 0;
  for (let node = element; node; node = node.offsetParent) {
    top += node.offsetTop;
  }
  return top;
}

function scrollWindowTo(top) {
  stopRunningScroll?.();
  if (prefersReducedMotion()) {
    window.scrollTo(0, top);
    return;
  }

  const start = window.scrollY;
  const distance = top - start;
  const duration = Math.min(
    MAX_SCROLL_MS,
    MIN_SCROLL_MS + Math.abs(distance) / PX_PER_EXTRA_MS,
  );
  let startTime = null;
  let frame = null;

  function stop() {
    window.cancelAnimationFrame(frame);
    INTERRUPTING_EVENTS.forEach((type) =>
      window.removeEventListener(type, stop),
    );
    stopRunningScroll = null;
  }

  function step(time) {
    startTime ??= time;
    const progress = Math.min(1, (time - startTime) / duration);
    window.scrollTo(0, start + distance * easeInOutCubic(progress));
    if (progress < 1) {
      frame = window.requestAnimationFrame(step);
      return;
    }
    stop();
  }

  INTERRUPTING_EVENTS.forEach((type) =>
    window.addEventListener(type, stop, { passive: true }),
  );
  stopRunningScroll = stop;
  frame = window.requestAnimationFrame(step);
}

// Focus moves to the section's heading, so Tab continues from there. preventScroll keeps the
// focus from cutting the scroll short with a jump of its own.
export function scrollToSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  // The section's scroll-margin-top (landing.module.css) leaves room above its heading, the same
  // room the browser leaves on its own jump to /#….
  const breathingRoom =
    parseFloat(window.getComputedStyle(section).scrollMarginTop) || 0;
  // The URL stays "/" (no hash), so a refresh returns to the top of the page.
  scrollWindowTo(Math.max(0, pageTop(section) - breathingRoom));
  section.querySelector("h2")?.focus({ preventScroll: true });
}

export function scrollToTop() {
  scrollWindowTo(0);
  document
    .querySelector(`#${MAIN_CONTENT_ID} h1`)
    ?.focus({ preventScroll: true });
}
