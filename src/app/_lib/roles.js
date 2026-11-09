// roles: where each role's pages live. HOME_BY_ROLE routes after login, a wrong role's dashboard
// and a sent reply; MESSAGES_BY_ROLE is the mail icon's link and a thread's base; DELETED_BY_ROLE
// is the trash icon's link.

export const HOME_BY_ROLE = { admin: "/admin", site_owner: "/dashboard" };

export const MESSAGES_BY_ROLE = {
  admin: "/admin/messages",
  site_owner: "/dashboard/messages",
};

export const DELETED_BY_ROLE = {
  admin: "/admin/deleted",
  site_owner: "/dashboard/deleted",
};
