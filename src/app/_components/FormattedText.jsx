// FormattedText: renders one paragraph's text with its formatting (docs/api.md → Paragraph
// formatting): <b> for bold, <i> for italic, <b><i> for both, and <a> for a link, inside any
// format around it, opening in a new tab like every other external link on the dashboard. It
// builds elements from parseParagraph and never sets raw HTML, so <, > and & in the text show as
// typed. Line breaks are kept by the caller's white-space: pre-line.
// A link is only built for an https:// URL; any other shows its characters as typed (rule 7).
// Saved posts can't hold one (saving rejects it), but unsaved text in the preview can.

import { isHttpsUrl } from "../_lib/validation";
import { parseParagraph } from "../_lib/postFormatting";

function renderLink(segment, key) {
  if (!isHttpsUrl(segment.url)) return `[${segment.text}](${segment.url})`;
  return (
    <a key={key} href={segment.url} target="_blank" rel="noopener noreferrer">
      {segment.text}
    </a>
  );
}

// The segments are read-only and in text order, so the index is a stable key.
function renderSegments(segments) {
  return segments.map((segment, index) => {
    if (segment.type === "text") return segment.text;
    if (segment.type === "link") return renderLink(segment, index);
    const children = renderSegments(segment.children);
    if (segment.type === "bold") return <b key={index}>{children}</b>;
    if (segment.type === "italic") return <i key={index}>{children}</i>;
    return (
      <b key={index}>
        <i>{children}</i>
      </b>
    );
  });
}

export default function FormattedText({ text }) {
  return renderSegments(parseParagraph(text));
}
