// Admin layout (server): renders every /admin route per request, then hands over to the client
// AdminLayout, which role-gates it and holds the admin data and Accounts aside. Per request
// because the nonce Content Security Policy (proxy.js) can only be stamped on a page rendered for
// that request.

import { connection } from "next/server";
import AdminLayout from "../_layout/AdminLayout";

export default async function Layout({ children }) {
  await connection();

  return <AdminLayout>{children}</AdminLayout>;
}
