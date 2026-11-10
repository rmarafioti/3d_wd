// roles: where each role's pages live: its dashboard (HOME_BY_ROLE), its mailbox (MESSAGES_BY_ROLE)
// and its Recently Deleted (DELETED_BY_ROLE).

export const HOME_BY_ROLE = { admin: "/admin", site_owner: "/dashboard" };

export const MESSAGES_BY_ROLE = {
  admin: "/admin/messages",
  site_owner: "/dashboard/messages",
};

export const DELETED_BY_ROLE = {
  admin: "/admin/deleted",
  site_owner: "/dashboard/deleted",
};
