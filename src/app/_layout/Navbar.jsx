// Navbar: site navigation; holds DashboardTitle and AuthButton.

import Link from "next/link";
import DashboardTitle from "../_components/DashboardTitle";
import AuthButton from "../_components/AuthButton";

export default function Navbar() {
  return (
    <nav>
      <Link href="/" aria-label="3D Web Dev home">
        3D Web Dev
      </Link>
      <DashboardTitle />
      <AuthButton />
    </nav>
  );
}
