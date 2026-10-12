// Navbar: site navigation; holds AuthButton.

import Link from "next/link";
import AuthButton from "../_components/AuthButton";

export default function Navbar() {
  return (
    <nav>
      <Link href="/" aria-label="3D Web Dev home">
        3D Web Dev
      </Link>
      <AuthButton />
    </nav>
  );
}
