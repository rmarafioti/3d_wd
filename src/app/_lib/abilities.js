// abilities: the catalog of ability kinds and their labels, and the helpers that read a website's
// abilities: pill words and tones, the pending request form and the request dialog's copy.

// The API lists only the abilities a website has, so the frontend keeps every kind, and a kind the
// website doesn't have can offer "+ Add". info is what the Abilities aside's "i" says it does.
export const ABILITY_KINDS = [
  {
    kind: "posts",
    label: "Posts",
    removable: false,
    info: "Write posts with text and photos, add bold, italics and links, and preview each post before it goes up. Publish it to your website or keep it as a draft. Tell us once where your posts should go, and we'll reply promptly by email with a mockup to approve.",
  },
  {
    kind: "galleries",
    label: "Photo Galleries",
    removable: true,
    info: "Create photo galleries of up to 30 photos each, with an optional square thumbnail and mobile crop for every photo. Give each gallery a title and copy, then tell us where on your website it should go. We'll reply promptly by email with a mockup to approve.",
  },
];

// Each word abilityPillLabel gives, with its pill's tone. A prompt takes the look of the state it
// stands for, so no new colours: "Add ?" an added ability's plain white, "Turn On ?" off's red.
export const ABILITY_PILL_TONES = {
  added: "plain",
  "Add ?": "plain",
  live: "green",
  off: "red",
  "Turn On ?": "red",
};

// A placement pill's tone: purple while requested, green once the administrator has set it live.
export function placementTone(placement) {
  return placement === "live" ? "green" : "purple";
}

// The website's ability of that kind, or undefined while it hasn't been added (or was removed).
// website: one from GET /api/siteOwner/websites or GET /api/admin/accounts.
export function findAbility(website, kind) {
  return website.abilities.find((ability) => ability.kind === kind);
}

export function abilityLabel(kind) {
  return ABILITY_KINDS.find((entry) => entry.kind === kind).label;
}

// The word on an ability's pill (docs/api.md → Notes, Abilities): its status, "added" or "live"
// (whether its code is wired into the client website), or "off" while live and turned off. Where
// its content goes is placement, shown in a pill of its own. With prompts (the site owner's
// Abilities aside), the pill also says what can be done next: "Add ?" for an ability the website
// hasn't added (undefined), and "Turn On ?" in place of "off". The admin can do neither, so the
// admin's list keeps "off".
export function abilityPillLabel(ability, { prompts = false } = {}) {
  if (!ability) return prompts ? "Add ?" : null;
  if (ability.status === "live" && !ability.turnedOn) {
    return prompts ? "Turn On ?" : "off";
  }
  return ability.status;
}

// Posts wait for their request form once the website has a post and either the form was never
// sent (placement null) or every post was deleted after it was, so the oldest post now is newer
// than the form (the backend's rule, docs/api.md → Notes, Abilities). Posts
// backfilled live without a form (placement live, requestedAt null) wait for nothing.
function postsPending(website) {
  const ability = findAbility(website, "posts");
  if (!ability || website.posts.length === 0) return false;
  if (ability.placement === null) return true;
  if (!ability.requestedAt) return false;
  const oldest = Math.min(
    ...website.posts.map((post) => Date.parse(post.createdAt)),
  );
  return oldest > Date.parse(ability.requestedAt);
}

// The first request form still waiting to be sent: a website's posts (postsPending), or a
// gallery whose own form hasn't been sent (each gallery says where it goes). The
// dashboard shows the required request dialog for it, so it comes back after a reload until it is
// sent. Returns { website, ability } for posts, { website, gallery } for a gallery, or null.
export function pendingRequest(websites) {
  for (const website of websites ?? []) {
    if (postsPending(website)) {
      return { website, ability: findAbility(website, "posts") };
    }
    const gallery = website.galleries.find(
      (summary) => summary.requestedAt === null,
    );
    if (gallery) return { website, gallery };
  }
  return null;
}

// The request dialog's heading and message for a website's posts, shared by the first form (the
// dashboard) and its edit (the Abilities aside), so both read the same.
export function postsRequestCopy(website) {
  return {
    heading: "Where should your posts go?",
    message: `Tell us where on ${website.websiteName} you'd like them to appear. We'll send you a mockup to approve before they go live.`,
  };
}

// The same for one gallery, which has its own place on the website: the first form (the
// dashboard) and its edit (the gallery page).
export function galleryRequestCopy(websiteName, gallery) {
  return {
    heading: `Where should ${gallery.galleryName} go?`,
    message: `Tell us where on ${websiteName} you'd like this gallery to appear. We'll send you a mockup to approve before it goes live.`,
  };
}
