// Navbar: site navigation; holds HomeLink, DashboardTitle, and AuditEventsLink (admin only)
// beside AuthButton.

import HomeLink from "../_components/HomeLink";
import DashboardTitle from "../_components/DashboardTitle";
import AuditEventsLink from "../_components/AuditEventsLink";
import AuthButton from "../_components/AuthButton";

import styles from "../_styling/navbar.module.css";

export default function Navbar() {
  return (
    <nav>
      <HomeLink />
      <DashboardTitle />
      {/* One group, so the nav's space-between still spreads three items across. */}
      <div className={styles.navActions}>
        <AuditEventsLink />
        <AuthButton />
      </div>
    </nav>
  );
}
