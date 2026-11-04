// Create an Account page (admin): the form, reading AdminDataContext. A Client Component, so no
// per-user data is server-rendered.

"use client";

import { useAdminData } from "../../_hooks/useAdminData";
import CreateAccountForm from "../../_components/CreateAccountForm";

import styles from "../../_styling/dashPages.module.css";

export default function CreateAccountPage() {
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
