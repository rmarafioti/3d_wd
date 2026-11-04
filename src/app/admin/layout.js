// Admin layout (server): hands every /admin route to the client AdminLayout, which role-gates it
// and holds the admin data and the Accounts aside.

import { connection } from "next/server";
import AdminLayout from "../_layout/AdminLayout";

export default async function Layout({ children }) {
  // Per request, so proxy.js's nonce Content Security Policy can be stamped on the page.
  await connection();

  return <AdminLayout>{children}</AdminLayout>;
}
