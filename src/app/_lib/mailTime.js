// mailTime: a mailbox row's local date and time, short and without seconds ("11/9/26, 9:14 AM"),
// so the row fits on one line beside its title.

export function formatMailTime(isoDate) {
  return new Date(isoDate).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}
