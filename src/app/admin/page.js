// Admin dashboard: the Create an Account form. The Accounts list and Link a Website live in the
// Accounts aside, which the admin layout renders on every /admin route; both read the same data
// from AdminDataContext. A Client Component on purpose: per-user data is only ever fetched
// client-side.

"use client";

import { useAdminData } from "../_hooks/useAdminData";
import CreateAccountForm from "../_components/CreateAccountForm";

import styles from "../_styling/dashPages.module.css";

export default function AdminPage() {
  const { accounts, websites } = useAdminData();

  return (
    <article>
      <section className={styles.createAccounts}>
        <h1 className={styles.header}>Create an Account</h1>
        {websites.error && <p>{websites.error.message}</p>}
        <CreateAccountForm
          websites={websites.data ?? []}
          createAccount={accounts.createAccount}
          onNewWebsite={websites.refetch}
        />
      </section>
    </article>
  );
}
