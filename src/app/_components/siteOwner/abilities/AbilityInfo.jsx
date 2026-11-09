// AbilityInfo: the "i" beside an ability's name in the Abilities aside, showing what the ability
// does on hover, keyboard focus or a tap, and always as the button's description for screen readers.

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GoInfo } from "react-icons/go";

import styles from "../../../_styling/abilityInfo.module.css";

// The box's width beside the row, in px (16rem).
const INFO_WIDTH = 256;

// Where the box opens, from the ability's row and the aside on screen. The aside's list scrolls,
// which would clip a box placed inside it, so the box is fixed to the screen instead: level with
// the row, its right edge on the aside's left border, when the screen has room; else (a phone,
// where the aside fills the screen) under the row, as wide as it.
function infoPosition(row, aside) {
  const rowRect = row.getBoundingClientRect();
  const asideLeft = aside.getBoundingClientRect().left;
  if (asideLeft >= INFO_WIDTH) {
    return {
      top: rowRect.top,
      // A fixed box's right is measured from the screen less its scrollbar, which clientWidth
      // leaves out (innerWidth doesn't). 1px over, so its right border lies on the aside's border,
      // as the ⋮ lists' do on a line.
      right: document.documentElement.clientWidth - asideLeft - 1,
      width: INFO_WIDTH,
    };
  }
  return { top: rowRect.bottom, left: rowRect.left, width: rowRect.width };
}

// label is the ability's name ("Photo Galleries"), info what it does.
export default function AbilityInfo({ label, info }) {
  const [position, setPosition] = useState(null); // null while closed
  const buttonRef = useRef(null);
  const infoId = useId();
  const open = position !== null;

  // A fixed box doesn't move with the page or the list, so any scroll closes it.
  useEffect(() => {
    if (!open) return;
    function close() {
      setPosition(null);
    }
    document.addEventListener("scroll", close, true);
    return () => document.removeEventListener("scroll", close, true);
  }, [open]);

  function show() {
    const button = buttonRef.current;
    setPosition(infoPosition(button.closest("li"), button.closest("aside")));
  }

  function hide() {
    setPosition(null);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") hide();
  }

  return (
    <>
      {/* Click as well as focus: iPhone Safari doesn't focus a tapped button. */}
      <button
        ref={buttonRef}
        type="button"
        className={styles.infoButton}
        aria-label={`About ${label}`}
        aria-describedby={infoId}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={show}
        onKeyDown={handleKeyDown}
      >
        <GoInfo aria-hidden="true" />
      </button>
      {/* Always in the page, so the button's description is there while it is hidden. Its place
          is measured from the row on screen, which no class can hold. */}
      <span
        id={infoId}
        role="tooltip"
        hidden={!open}
        className={styles.info}
        style={position ?? undefined}
      >
        {info}
      </span>
    </>
  );
}
