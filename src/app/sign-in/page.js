// Sign-in page (Server Component): reads ?expired=1 on the server and renders SignInForm,
// which holds the Google button and the sign-in dialog.

import SignInForm from "../_components/SignInForm";

import styles from "../_styling/signIn.module.css";

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;

  return (
    <article>
      <h1 className={styles.header}>Sign In</h1>
      <SignInForm expired={params.expired === "1"} />
    </article>
  );
}
