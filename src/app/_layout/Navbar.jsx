// Navbar: site navigation; holds AuthButton.

import Link from "next/link";
import AuthButton from "../_components/AuthButton";

import stlyes from "../_styling/navbar.module.css";

export default function Navbar() {
  return (
    <nav>
      <header>3d Web Dev</header>
      <div className={stlyes.controlContainer}>
        <Link href="/" className={stlyes.home}>
          Home
        </Link>
        <AuthButton />
      </div>
    </nav>
  );
}
