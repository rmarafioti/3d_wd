// pillTones: the Pill tone for a post's or gallery's status and for each kind of mail, so every
// place showing one reads the same colour.

// The pill that says what a mail item is: an update can't be replied to, a message (a thread, as
// the API calls it) can.
export const MAIL_TONE = { update: "plain", message: "purple" };

// A post's or gallery's status: "published" green, "draft" red.
export function statusTone(status) {
  return status === "published" ? "green" : "red";
}
