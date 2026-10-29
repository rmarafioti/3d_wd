// SignInForm: Google sign-in button (inside GoogleOAuthProvider), the "Signing in…" dialog,
// the login error dialog, and the session-expired message. On success, routes once on the
// returned role; the role is not stored anywhere.

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { apiFetch } from "../_lib/apiFetch";
import { HOME_BY_ROLE } from "../_lib/roles";
import { useIsPhone } from "../_hooks/useIsPhone";
import DialogCloseButton from "./DialogCloseButton";

import styles from "../_styling/signIn.module.css";

export default function SignInForm({ expired }) {
  const router = useRouter();
  const dialogRef = useRef(null);
  const [error, setError] = useState(null);
  const isPhone = useIsPhone();

  async function handleGoogleSuccess({ credential }) {
    setError(null);
    dialogRef.current.showModal();

    try {
      const { role } = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { credential },
      });
      router.replace(HOME_BY_ROLE[role]);
    } catch (err) {
      setError(err);
      // Esc may have closed "Signing in…" while waiting; reopen it so the error is seen.
      if (!dialogRef.current.open) dialogRef.current.showModal();
    }
  }

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
      {expired && <p>Your session expired, please sign in again.</p>}

      {/* A failed or cancelled Google step sends nothing; Google's own UI covers it. */}
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => {}}
        size="large"
        // Google draws the button at this pixel width inside its own frame, so CSS can't shrink
        // it; 280 fits a 320px-wide phone with the page's 1rem gutters.
        width={isPhone ? "280" : "400"}
        shape="pill"
        theme="outline"
        text="signin_with"
      />

      <dialog ref={dialogRef}>
        {/* No X while "Signing in…": it ends on its own, by routing away or by becoming the
            error, which can then be closed. */}
        {error && <DialogCloseButton dialogRef={dialogRef} />}
        {error ? (
          <p>
            {error.message}
            {error.status === 401 && (
              <>
                {" "}
                <a
                  href={`mailto:${process.env.NEXT_PUBLIC_ADMIN_CONTACT_EMAIL}`}
                >
                  contact us
                </a>
              </>
            )}
          </p>
        ) : (
          <p>Signing in…</p>
        )}
      </dialog>
    </GoogleOAuthProvider>
  );
}
