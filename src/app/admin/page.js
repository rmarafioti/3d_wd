// Admin dashboard (/admin): a prompt to pick an action from the Navbar's links, each its own page.

import styles from "../_styling/dashPages.module.css";

export default function AdminPage() {
  return (
    <article>
      <p className={styles.header}>Choose an action from the menu.</p>
    </article>
  );
}
