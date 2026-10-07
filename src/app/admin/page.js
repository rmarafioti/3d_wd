// Admin dashboard: Create an Account form, the Accounts list, and Link a Website (a dialog opened
// from each account). A Client Component on purpose: per-user data is only ever fetched
// client-side.

"use client";

import { useState } from "react";
import { useAccounts } from "../_hooks/useAccounts";
import { useAllWebsites } from "../_hooks/useAllWebsites";
import CreateAccountForm from "../_components/CreateAccountForm";
import AccountList from "../_components/AccountList";
import LinkWebsiteDialog from "../_components/LinkWebsiteDialog";
import CredentialRevealModal from "../_components/CredentialRevealModal";
import MessageDialog from "../_components/MessageDialog";

export default function AdminPage() {
  const accounts = useAccounts();
  const websites = useAllWebsites();
  // The account whose Link a Website dialog is open, or null.
  const [linkingAccount, setLinkingAccount] = useState(null);
  // { accountName, response } from a successful link, held only while its result dialog is
  // open. The response may contain the one-time credentials, so it is set back to null the
  // moment that dialog closes.
  const [linkResult, setLinkResult] = useState(null);

  function handleLinked(response) {
    // The link response has no account, so the name comes from the account the dialog was for.
    setLinkResult({ accountName: linkingAccount.name, response });
    setLinkingAccount(null);
  }

  function handleRevealClose() {
    setLinkResult(null);
    // A new website was created, so the pickers need it.
    websites.refetch();
  }

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
          onLink={setLinkingAccount}
        />
      </section>

      {linkingAccount && (
        <LinkWebsiteDialog
          account={linkingAccount}
          websites={websites.data ?? []}
          linkWebsite={accounts.linkWebsite}
          onSuccess={handleLinked}
          onClose={() => setLinkingAccount(null)}
        />
      )}
      {linkResult?.response.credentials && (
        <CredentialRevealModal
          website={linkResult.response.website}
          credentials={linkResult.response.credentials}
          onClose={handleRevealClose}
        />
      )}
      {linkResult && !linkResult.response.credentials && (
        <MessageDialog
          message={`${linkResult.response.website.websiteName} linked to ${linkResult.accountName}. No new API key or webhook secret were generated — the website's existing credentials are unchanged.`}
          onClose={() => setLinkResult(null)}
        />
      )}
    </>
  );
}
