// bulkResults: the one line a bulk delete or restore shows when some items failed, naming each
// item, since the API's failed list carries only each item's type and id.

// verb: "delete" or "restore". failed: [{ type, id, message }] from the API. items: what was sent,
// each { type, id, name }, so a failure can be named.
export function failedMessage(verb, failed, items) {
  const parts = failed.map((failure) => {
    const item = items.find(
      (sent) => sent.type === failure.type && sent.id === failure.id,
    );
    return `${item?.name ?? failure.id} (${failure.message})`;
  });
  return `Couldn't ${verb}: ${parts.join("; ")}`;
}
