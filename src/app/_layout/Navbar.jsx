// Navbar: site navigation; holds AuthButton.

import Link from "next/link";
import AuthButton from "../_components/AuthButton";

export default function Navbar() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <AuthButton />
    </nav>
  );
}
