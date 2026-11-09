// FormattedText: renders one paragraph's text with its formatting (docs/api.md → Paragraph
// formatting), building elements and never raw HTML, so <, > and & in the text show as typed.

import { isHttpsUrl } from "../../_lib/validation";
import { parseParagraph } from "../../_lib/postFormatting";

// A link is only built for an https:// URL; any other shows its characters as typed (rule 7).
// Saved posts can't hold one (saving rejects it), but unsaved text in the preview can. A link opens
// in a new tab, like every other external link on the dashboard.
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
