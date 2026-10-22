// Site owner layout (server): renders every /dashboard route per request, then hands over to the
// client DashboardLayout, which role-gates it. Per request because the nonce Content Security
// Policy (proxy.js) can only be stamped on a page rendered for that request.

import { connection } from "next/server";
import DashboardLayout from "../_layout/DashboardLayout";

export default async function Layout({ children }) {
  await connection();

  return <DashboardLayout>{children}</DashboardLayout>;
}
