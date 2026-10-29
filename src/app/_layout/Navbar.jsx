// Navbar: site navigation; holds HomeLink, DashboardTitle and AuthButton.

import HomeLink from "../_components/HomeLink";
import DashboardTitle from "../_components/DashboardTitle";
import AuthButton from "../_components/AuthButton";

export default function Navbar() {
  return (
    <nav>
      <HomeLink />
      <DashboardTitle />
      <AuthButton />
    </nav>
  );
}
