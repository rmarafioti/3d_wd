// ItemFields: the labelled inputs for one image or link in the post form, shared by
// PostBodyFields (image elements) and LinkFields. Messages show for a field once it has been
// left, or for every field when showAllErrors is set; otherwise the server's message shows.

"use client";

import { Fragment, useId, useState } from "react";

// Picks one item's server messages out of error.fields by its path prefix:
// ("body.2.image.") turns "body.2.image.src" into { src: "..." }.
export function serverErrorsFor(fieldErrors, prefix) {
  const errors = {};
  for (const [path, message] of Object.entries(fieldErrors)) {
    if (path.startsWith(prefix)) errors[path.slice(prefix.length)] = message;
  }
  return errors;
}

// fields: [{ name, label, ...inputProps }] in display order. Every entry other than name and
// label is passed straight to the <input>.
export default function ItemFields({
  fields,
  validate,
  value,
  onPatch,
  serverErrors,
  showAllErrors,
}) {
  const id = useId();
  const [touched, setTouched] = useState({});
  const errors = validate(value);

  function messageFor(name) {
    if ((showAllErrors || touched[name]) && errors[name]) return errors[name];
    return serverErrors[name];
  }

  return fields.map(({ name, label, ...inputProps }) => {
    const message = messageFor(name);
    return (
      <Fragment key={name}>
        <label htmlFor={`${id}-${name}`}>{label}</label>
        <input
          id={`${id}-${name}`}
          {...inputProps}
          value={value[name]}
          onChange={(e) => onPatch({ [name]: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
        />
        {message && <p>{message}</p>}
      </Fragment>
    );
  });
}
