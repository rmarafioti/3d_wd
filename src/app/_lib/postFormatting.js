// postFormatting: the one reader of paragraph markup (docs/api.md → Paragraph formatting).
// A paragraph's text holds ***bold and italic***, **bold**, *italic* and [link text](url), and
// the formats may contain links; everything else is plain text.
// - findLinks lists every link for validation, matching the backend's scan link for link.
// - parseParagraph splits the text into the segments a renderer draws, left to right.
// - formatRunAround, linkAround and formatsAtCaret find the markup around a selection or the
//   cursor, so the editor's buttons can show it as on and change it.
// Every scan reads each character about once, so a long paragraph of unmatched [ or * can't
// freeze the editor while the site owner types.

// The index of the first character from `start` that passes `isStop`, or text.length.
function scanTo(text, start, isStop) {
  let index = start;
  while (index < text.length && !isStop(text[index])) index += 1;
  return index;
}

function isLinkTextStop(char) {
  return char === "]" || char === "\n";
}

function isUrlStop(char) {
  return char === ")" || /\s/.test(char);
}

// Every [link text](url) in a paragraph, left to right. Link text has no ] or line break; the URL
// has no whitespace and ends at the first ). A port of the backend's findLinks, so both sides
// check the same links.
// - a [ whose link text never reaches ]( fails the same way for every [ before that point,
//   so the search skips past it;
// - a URL that ran out before a ) is remembered, and a later URL starting before that point
//   fails without being read again.
export function findLinks(text) {
  const links = [];
  let urlStopAt = -1;
  let open = text.indexOf("[");
  while (open !== -1) {
    const close = scanTo(text, open + 1, isLinkTextStop);
    let next = close + 1;
    if (text[close] === "]" && text[close + 1] === "(") {
      const urlStart = close + 2;
      const urlEnd =
        urlStart <= urlStopAt ? urlStopAt : scanTo(text, urlStart, isUrlStop);
      if (text[urlEnd] === ")") {
        links.push({
          linkText: text.slice(open + 1, close),
          url: text.slice(urlStart, urlEnd),
        });
        next = urlEnd + 1;
      } else {
        urlStopAt = urlEnd;
      }
    }
    open = text.indexOf("[", next);
  }
  return links;
}

// The formats by marker, longest first (rule 1 tries *** before ** before *). A format's level is
// its marker length, read as two bits: 2 is bold, 1 is italic, 3 is both.
const FORMATS = [
  { type: "boldItalic", marker: "***" },
  { type: "bold", marker: "**" },
  { type: "italic", marker: "*" },
];
const LEVEL_BY_TYPE = { italic: 1, bold: 2, boldItalic: 3 };

// A format applies only when the text between its markers isn't empty and doesn't start or end
// with a space (rule 3), so "5 * 3 * 2" stays as typed. The editor's loose reading also accepts
// empty text, or text that only ends in a space, while a format is still being typed; text that
// starts with a space never counts, so "** **" and "* *" are never offered as a format.
function isFormattable(inner, loose) {
  if (loose) return inner === "" || !/^\s/.test(inner);
  return inner !== "" && inner.trim() === inner;
}

// For each position, the next character that passes `isStop` at or after it (text.length if
// none), worked out once from the end so every lookup afterwards is immediate.
function nextStops(text, isStop) {
  const stops = new Int32Array(text.length + 2).fill(text.length);
  for (let index = text.length - 1; index >= 0; index -= 1) {
    stops[index] = isStop(text[index]) ? index : stops[index + 1];
  }
  return stops;
}

// The paragraph as segments, in order:
// - { type: "text", text };
// - { type: "link", text, url };
// - { type: "bold" | "italic" | "boldItalic", text, children }, where children are the text and
//   link segments inside it.
// Every segment but text also carries outerStart / outerEnd around its markup and innerStart /
// innerEnd around its words. Rules 1–4: read left to right; at [ try a link, at *** bold-italic,
// at ** bold, at a single * italic. If a pattern doesn't complete, only its first character shows
// as typed and reading moves on one character. A format ends at its next marker on the same
// line; while looking for it, a link is skipped whole. Formats hold links and nothing else, and
// link text is plain.
// loose is for the editor only (see isFormattable).
export function parseParagraph(text, { loose = false } = {}) {
  const linkTextStops = nextStops(text, isLinkTextStop);
  const urlStops = nextStops(text, isUrlStop);
  const lineEnds = nextStops(text, (char) => char === "\n");
  // Per marker, where a search for its closer last failed and the end of that line. A later
  // search for the same marker on that line, from there or further on, would read the same
  // characters and fail the same way, so it fails at once.
  const failedSearches = {};

  // The link starting at the [ at `open`, or null.
  function linkAt(open) {
    const close = linkTextStops[open + 1];
    if (text[close] !== "]" || text[close + 1] !== "(") return null;
    const urlStart = close + 2;
    const urlEnd = urlStops[urlStart];
    if (text[urlEnd] !== ")") return null;
    return {
      type: "link",
      text: text.slice(open + 1, close),
      url: text.slice(urlStart, urlEnd),
      outerStart: open,
      outerEnd: urlEnd + 1,
      innerStart: open + 1,
      innerEnd: close,
    };
  }

  // Where `marker` next occurs from `from` before `lineEnd`, skipping links whole, or -1.
  function closerFrom(marker, from, lineEnd) {
    const failed = failedSearches[marker];
    if (failed && failed.lineEnd === lineEnd && from >= failed.from) return -1;
    let index = from;
    while (index < lineEnd) {
      const link = text[index] === "[" ? linkAt(index) : null;
      if (link) {
        index = link.outerEnd;
        continue;
      }
      if (text.startsWith(marker, index)) return index;
      index += 1;
    }
    failedSearches[marker] = { from, lineEnd };
    return -1;
  }

  // The text and links inside a format, as segments.
  function linksWithin(start, end) {
    const children = [];
    let plain = "";
    let index = start;
    while (index < end) {
      const link = text[index] === "[" ? linkAt(index) : null;
      if (link) {
        if (plain) children.push({ type: "text", text: plain });
        plain = "";
        children.push(link);
        index = link.outerEnd;
        continue;
      }
      plain += text[index];
      index += 1;
    }
    if (plain) children.push({ type: "text", text: plain });
    return children;
  }

  // The format opened by `format.marker` at `open`, or null.
  function formatAt(open, { type, marker }) {
    const innerStart = open + marker.length;
    const close = closerFrom(marker, innerStart, lineEnds[open]);
    if (close === -1) return null;
    const inner = text.slice(innerStart, close);
    if (!isFormattable(inner, loose)) return null;
    return {
      type,
      text: inner,
      children: linksWithin(innerStart, close),
      outerStart: open,
      outerEnd: close + marker.length,
      innerStart,
      innerEnd: close,
    };
  }

  const segments = [];
  let plain = "";
  let index = 0;
  while (index < text.length) {
    let segment = null;
    if (text[index] === "[") {
      segment = linkAt(index);
    } else if (text[index] === "*") {
      const format = FORMATS.find(({ marker }) =>
        text.startsWith(marker, index),
      );
      segment = formatAt(index, format);
    }

    if (!segment) {
      plain += text[index];
      index += 1;
      continue;
    }
    if (plain) segments.push({ type: "text", text: plain });
    plain = "";
    segments.push(segment);
    index = segment.outerEnd;
  }
  if (plain) segments.push({ type: "text", text: plain });
  return segments;
}

// How many * sit right before `index` (stepping left) or right from it (stepping right).
function starsBefore(text, index) {
  let count = 0;
  while (text[index - 1 - count] === "*") count += 1;
  return count;
}

function starsFrom(text, index) {
  let count = 0;
  while (text[index + count] === "*") count += 1;
  return count;
}

// The bold, italic or bold-italic run around a selection text[start, end), or null, as
// { level, outerStart, outerEnd, innerStart, innerEnd }: either the same number (1–3) of * sits
// right outside the selection on both sides, or the selection is the whole run, markers included.
export function formatRunAround(text, start, end) {
  const before = starsBefore(text, start);
  if (before >= 1 && before <= 3 && starsFrom(text, end) === before) {
    return {
      level: before,
      outerStart: start - before,
      outerEnd: end + before,
      innerStart: start,
      innerEnd: end,
    };
  }
  const leading = starsFrom(text, start);
  const trailing = starsBefore(text, end);
  if (
    leading >= 1 &&
    leading <= 3 &&
    trailing === leading &&
    end - start > leading * 2 &&
    text[start - 1] !== "*" &&
    text[end] !== "*"
  ) {
    return {
      level: leading,
      outerStart: start,
      outerEnd: end,
      innerStart: start + leading,
      innerEnd: end - leading,
    };
  }
  return null;
}

// The rest of a link after its text: "](url)", with the same URL rule as findLinks.
const LINK_TAIL = /^\]\([^\s)]*\)/;
const WHOLE_LINK = /^\[[^\]\n]*\]\([^\s)]*\)$/;

// The link whose text, or whole markup, is the selection text[start, end), as
// { outerStart, outerEnd, innerStart, innerEnd }, or null.
export function linkAround(text, start, end) {
  const tail = LINK_TAIL.exec(text.slice(end));
  if (text[start - 1] === "[" && tail) {
    return {
      outerStart: start - 1,
      outerEnd: end + tail[0].length,
      innerStart: start,
      innerEnd: end,
    };
  }
  if (WHOLE_LINK.test(text.slice(start, end))) {
    return {
      outerStart: start,
      outerEnd: end,
      innerStart: start + 1,
      innerEnd: text.indexOf("](", start),
    };
  }
  return null;
}

function positionsOf({ outerStart, outerEnd, innerStart, innerEnd }) {
  return { outerStart, outerEnd, innerStart, innerEnd };
}

// What the cursor at `caret` is inside, for the editor's buttons: { run, link }, each null or
// in the shape of formatRunAround / linkAround. Formats are read loosely (see isFormattable).
// - A run is found when the cursor touches it anywhere from its opening marker to its closing
//   one. run.edge is "start" or "end" when the cursor sits just outside it (before the opening
//   marker, after the closing one), where typing is plain; inside the markers it is null, so a
//   button stays on while the site owner types, even with the cursor between the closing *.
// - A link is found when the cursor is in its text.
// - An empty run ("**", "****", "******") isn't found by reading left to right, so when no run
//   touches the cursor it is recognised from the stars around it: the same number on both sides
//   (the cursor in the middle), or four or six on one side only (the cursor just outside an
//   empty bold or bold-italic pair, with run.edge set). Two stars on one side aren't read as an
//   empty italic pair, since they could as well close bold the editor doesn't recognise.
export function formatsAtCaret(text, caret) {
  const inText = (segment) =>
    segment.innerStart <= caret && caret <= segment.innerEnd;
  const touches = (segment) =>
    segment.outerStart <= caret && caret <= segment.outerEnd;
  let run = null;
  let link = null;
  for (const segment of parseParagraph(text, { loose: true })) {
    if (segment.type === "link" && inText(segment)) link = segment;
    const level = LEVEL_BY_TYPE[segment.type];
    if (!level || !touches(segment)) continue;
    const edge =
      (caret === segment.outerStart && "start") ||
      (caret === segment.outerEnd && "end") ||
      null;
    // Two runs can touch the cursor when it sits between them; the one it is inside wins.
    if (run && !run.edge) continue;
    run = { level, edge, ...positionsOf(segment) };
    link =
      segment.children.find(
        (child) => child.type === "link" && inText(child),
      ) ?? link;
  }
  if (run) return { run, link: link ? positionsOf(link) : null };

  return {
    run: emptyRunAt(text, caret),
    link: link ? positionsOf(link) : null,
  };
}

// The empty run the cursor is in or just outside (see formatsAtCaret), or null.
function emptyRunAt(text, caret) {
  const before = starsBefore(text, caret);
  const after = starsFrom(text, caret);
  const emptyRun = (outerStart, level, edge) => ({
    level,
    edge,
    outerStart,
    outerEnd: outerStart + 2 * level,
    innerStart: outerStart + level,
    innerEnd: outerStart + level,
  });
  const isPair = (count) => count === 4 || count === 6;
  if (before >= 1 && before <= 3 && after === before) {
    return emptyRun(caret - before, before, null);
  }
  if (after === 0 && isPair(before)) {
    return emptyRun(caret - before, before / 2, "end");
  }
  if (before === 0 && isPair(after)) {
    return emptyRun(caret, after / 2, "start");
  }
  return null;
}
