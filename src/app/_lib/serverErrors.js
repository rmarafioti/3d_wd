// serverErrors: helpers for an ApiError the backend sent ({ message, fields }), once the form it
// described has changed.

// The error without the field messages whose path matches (matches(path) is true), or the error
// unchanged when it has no field messages.
export function withoutFieldErrors(error, matches) {
  if (!error?.fields) return error;
  const fields = Object.fromEntries(
    Object.entries(error.fields).filter(([path]) => !matches(path)),
  );
  return { ...error, fields };
}
