// SubmitErrors: the messages below Submit in Create an Account and Link a Website: frontend
// messages for the fields the admin has left, then the backend's error.message.

export default function SubmitErrors({ errors, touched, serverError }) {
  return (
    <>
      {Object.entries(errors)
        .filter(([field]) => touched[field])
        .map(([field, message]) => (
          <p key={field}>{message}</p>
        ))}
      {serverError && <p>{serverError.message}</p>}
      {/* There is no websiteId input, so this field message goes with the general error. */}
      {serverError?.fields?.websiteId && <p>{serverError.fields.websiteId}</p>}
    </>
  );
}
