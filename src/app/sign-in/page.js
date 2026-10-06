// Sign-in page (Server Component): reads ?expired=1 on the server and renders SignInForm,
// which holds the Google button and the sign-in dialog.

import SignInForm from "../_components/SignInForm";

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;

  return <SignInForm expired={params.expired === "1"} />;
}
