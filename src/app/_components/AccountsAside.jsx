// AccountsAside (admin): the Accounts panel at the top right of every /admin route, below the
// Navbar, rendered by the admin layout. Closed by default; its toggle opens the AccountList over
// the page content. Owns the Link a Website flow started from each account: the form dialog,
// then the one-time CredentialRevealModal (new website) or a confirmation dialog (existing
// website). That flow lives outside the panel, so its dialogs stay open if the panel closes. Also
// owns switching a requested ability live: a confirmation first, since the app can't undo it.

"use client";

import { useState } from "react";
import { GoTriangleDown, GoTriangleRight } from "react-icons/go";
import { useAdminData } from "../_hooks/useAdminData";
import { abilityLabel } from "../_lib/abilities";
import AccountList from "./AccountList";
import LinkWebsiteDialog from "./LinkWebsiteDialog";
import CredentialRevealModal from "./CredentialRevealModal";
import MessageDialog from "./MessageDialog";
import ConfirmDialog from "./ConfirmDialog";

import styles from "../_styling/accountsAside.module.css";

export default function AccountsAside() {
  const { accounts, websites } = useAdminData();
  const [open, setOpen] = useState(false);
  // The account whose Link a Website dialog is open, or null.
  const [linkingAccount, setLinkingAccount] = useState(null);
  // { accountName, response } from a successful link, held only while its result dialog is
  // open. The response may contain the one-time credentials, so it is set back to null the
  // moment that dialog closes.
  const [linkResult, setLinkResult] = useState(null);
  // { ability, website } whose Set live confirmation is open, or null.
  const [settingLive, setSettingLive] = useState(null);
  // A failed Set live's message, held only while its dialog is open.
  const [setLiveError, setSetLiveError] = useState(null);

  // Points right when closed and down when open, like the native marker on each account's
  // "Websites" <details> disclosure.
  const ToggleIcon = open ? GoTriangleDown : GoTriangleRight;

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

  // The confirm dialog closes first. On success the account list refetches (useAccounts), so the
  // pill reads "live".
  async function confirmSetLive() {
    const { ability } = settingLive;
    setSettingLive(null);
    try {
      await accounts.setAbilityLive(ability.id);
    } catch (err) {
      setSetLiveError(err.message);
    }
  }

  return (
    <aside
      aria-label="Accounts"
      className={`${styles.aside} ${open ? styles.open : styles.closed}`}
    >
      {/* aria-label keeps the name "Accounts" at phone width, where the text is hidden while closed. */}
      <button
        type="button"
        aria-label="Accounts"
        aria-expanded={open}
        aria-controls="accounts-panel"
        onClick={() => setOpen((current) => !current)}
        className={styles.toggle}
      >
        <ToggleIcon aria-hidden="true" />
        <span className={styles.toggleText}>Accounts</span>
      </button>

      {open && (
        <div id="accounts-panel" className={styles.panel}>
          <AccountList
            accounts={accounts.data}
            loading={accounts.loading}
            error={accounts.error}
            onLink={setLinkingAccount}
            onSetLive={(ability, website) =>
              setSettingLive({ ability, website })
            }
          />
        </div>
      )}

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
          message={`${linkResult.response.website.websiteName} linked to ${linkResult.accountName}. No new API key or webhook secret was generated. The website's existing credentials are unchanged.`}
          onClose={() => setLinkResult(null)}
        />
      )}
      {settingLive && (
        <ConfirmDialog
          message={`Set ${abilityLabel(settingLive.ability.kind)} live for ${settingLive.website.websiteName}? Only do this once it shows on their website and they have approved it.`}
          confirmLabel="Set live"
          onConfirm={confirmSetLive}
          onClose={() => setSettingLive(null)}
        />
      )}
      {setLiveError && (
        <MessageDialog
          message={setLiveError}
          onClose={() => setSetLiveError(null)}
        />
      )}
    </aside>
  );
}
