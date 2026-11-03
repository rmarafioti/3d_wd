// Admin dashboard (/admin): no section shows until the admin picks an action from the Navbar's
// links (Create an Account, Audit Events), each its own page (Rich, 2026-11-03). The Accounts
// aside is the admin layout's, on every /admin route.

import styles from "../_styling/dashPages.module.css";

export default function AdminPage() {
  return (
    <article>
      <p className={styles.header}>Choose an action from the menu.</p>
    </article>
  );
}
