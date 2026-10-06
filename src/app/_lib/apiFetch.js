// apiFetch: the only place `fetch` is called. Prefixes NEXT_PUBLIC_API_BASE_URL, sends
// credentials: 'include', JSON, X-CSRF-Protection on POST/PATCH/DELETE, unwraps { data },
// throws the { error } envelope, and handles 401 (session expiry).

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const GENERIC_MESSAGE = "Something went wrong, please try again.";
const LOGIN_PATH = "/api/auth/login";

// Error thrown for every failed request, carrying what the UI needs to display it.
export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.name = "ApiError";
    this.status = status; // 0 means the request never reached the backend
    this.fields = fields; // only present on validation errors (400)
  }
}

export async function apiFetch(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // The backend rejects any state-changing request without this header (403).
  if (method !== "GET") headers["X-CSRF-Protection"] = "1";

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(GENERIC_MESSAGE, 0);
  }

  if (response.status === 204) return null;

  // A body that isn't JSON (e.g. a proxy error page) is treated as an unknown error.
  let json = null;
  try {
    json = await response.json();
  } catch {}

  if (response.ok) return json?.data ?? null;

  const error = new ApiError(
    json?.error?.message ?? GENERIC_MESSAGE,
    response.status,
    json?.error?.fields,
  );

  // Session expired or invalid. A full page load resets all React state, which clears
  // AuthContext. The login call is excluded: its 401 is shown in the sign-in dialog.
  if (response.status === 401 && path !== LOGIN_PATH) {
    // A full reload is intentional here (it clears all client state); useRouter is unavailable outside React.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/sign-in?expired=1");
  }

  throw error;
}
