// abilities: the catalog of abilities the Client Portal offers a website (docs/api.md → Notes,
// Abilities). The API lists only the abilities a website has; the frontend keeps every kind and
// its label, so a kind the website doesn't have can offer "+ Add". Posts are every website's from
// the start and can't be removed; Photo Galleries are added and can be.

export const ABILITY_KINDS = [
  { kind: "posts", label: "Posts", removable: false },
  { kind: "galleries", label: "Photo Galleries", removable: true },
];

// The website's ability of that kind, or undefined while it hasn't been added (or was removed).
// website: one from GET /api/siteOwner/websites or GET /api/admin/accounts.
export function findAbility(website, kind) {
  return website.abilities.find((ability) => ability.kind === kind);
}

export function abilityLabel(kind) {
  return ABILITY_KINDS.find((entry) => entry.kind === kind).label;
}

// The word on an ability's pill (docs/api.md → Notes, Abilities): "requested" while a request
// waits, even if the site owner turned it off, so a new message is always flagged (Rich,
// 2026-11-02); otherwise "off" while turned off, otherwise its status.
export function abilityPillLabel(ability) {
  if (ability.status === "requested") return "requested";
  return ability.turnedOn ? ability.status : "off";
}

// Posts wait for their request form once the website has a post and either the form was never
// sent (added) or every post was deleted after it was, so the oldest post now is newer than the
// form (Rich, 2026-11-02). A posts ability backfilled live without a form (requestedAt null) waits
// for nothing.
function postsPending(website) {
  const ability = findAbility(website, "posts");
  if (!ability || website.posts.length === 0) return false;
  if (ability.status === "added") return true;
  if (!ability.requestedAt) return false;
  const oldest = Math.min(
    ...website.posts.map((post) => Date.parse(post.createdAt)),
  );
  return oldest > Date.parse(ability.requestedAt);
}

// The first request form still waiting to be sent: a website's posts (postsPending), or a
// gallery whose own form hasn't been sent (each gallery says where it goes, Rich 2026-11-02). The
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
