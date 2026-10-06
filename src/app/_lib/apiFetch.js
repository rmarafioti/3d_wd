// apiFetch: the only place `fetch` is called. Prefixes NEXT_PUBLIC_API_BASE_URL, sends
// credentials: 'include', JSON, X-CSRF-Protection on POST/PATCH/DELETE, unwraps { data },
// throws the { error } envelope, and handles 401 (session expiry).
