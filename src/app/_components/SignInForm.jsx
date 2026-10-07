// SignInForm: Google sign-in button (inside GoogleOAuthProvider), the "Signing in…" dialog,
// the login error dialog, and the session-expired message. On success, routes once on the
// returned role; the role is not stored anywhere.

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { apiFetch } from "../_lib/apiFetch";
import { HOME_BY_ROLE } from "../_lib/roles";

export default function SignInForm({ expired }) {
  const router = useRouter();
  const dialogRef = useRef(null);
  const [error, setError] = useState(null);

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
    }
  }

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
      {expired && <p>Your session expired, please sign in again.</p>}

      {/* A failed or cancelled Google step sends nothing; Google's own UI covers it. */}
      <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => {}} />

      <dialog ref={dialogRef}>
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
        <button type="button" onClick={() => dialogRef.current.close()}>
          Close
        </button>
      </dialog>
    </GoogleOAuthProvider>
  );
}
