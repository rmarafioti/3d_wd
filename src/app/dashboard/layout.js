// Site owner layout (server): hands every /dashboard route to the client DashboardLayout, which
// role-gates it.

import { connection } from "next/server";
import DashboardLayout from "../_layout/DashboardLayout";

export default async function Layout({ children }) {
  // Per request, so proxy.js's nonce Content Security Policy can be stamped on the page.
  await connection();

  return <DashboardLayout>{children}</DashboardLayout>;
}
