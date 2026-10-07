// roles: where each role's dashboard lives. Used to route after login (SignInForm) and to
// redirect a user who lands on the other role's dashboard (useRoleGate).

export const HOME_BY_ROLE = { admin: "/admin", site_owner: "/dashboard" };
