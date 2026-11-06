// FormattedMessage: an update's body or a thread message as it reads, its formatting rendered and
// its line breaks kept.

import FormattedText from "./FormattedText";

export default function FormattedMessage({ text }) {
  return (
    // pre-line is functional: the contract keeps typed line breaks (docs/api.md).
    <p style={{ whiteSpace: "pre-line" }}>
      <FormattedText text={text.trim()} />
    </p>
  );
}
