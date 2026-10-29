// AuditEventsLink: Navbar client island, the "Audit Events" link to /admin/auditEvents, shown to
// the admin only. AuthContext is filled only by the role-gated dashboard layouts, so it shows
// nothing on the landing and sign-in pages or to a site owner.

"use client";

import Link from "next/link";
import { useAuth } from "../_hooks/useAuth";

export default function AuditEventsLink() {
  const { user } = useAuth();

  if (user?.role !== "admin") return null;
  // next/link is fine here: every /admin page has the nonce policy, so a client-side route
  // between them keeps the right one (the plain-link rule is for static → session pages).
  return <Link href="/admin/auditEvents">Audit Events</Link>;
}
