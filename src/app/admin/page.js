// Admin dashboard: Create an Account form and the Accounts list (Link a Website arrives in step 6).
// A Client Component on purpose: per-user data is only ever fetched client-side.

"use client";

import { useAccounts } from "../_hooks/useAccounts";
import { useAllWebsites } from "../_hooks/useAllWebsites";
import CreateAccountForm from "../_components/CreateAccountForm";
import AccountList from "../_components/AccountList";

export default function AdminPage() {
  const accounts = useAccounts();
  const websites = useAllWebsites();

  return (
    <>
      <h1>Admin Dashboard</h1>

      <section>
        <h2>Create an Account</h2>
        {websites.error && <p>{websites.error.message}</p>}
        <CreateAccountForm
          websites={websites.data ?? []}
          createAccount={accounts.createAccount}
          onNewWebsite={websites.refetch}
        />
      </section>

      <section>
        <h2>Accounts</h2>
        <AccountList
          accounts={accounts.data}
          loading={accounts.loading}
          error={accounts.error}
        />
      </section>
    </>
  );
}
