async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    },
    ...options
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

function getAdminSession() {
  return apiFetch("/api/auth/session");
}

function loginAdmin(credentials) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
}

function logoutAdmin() {
  return apiFetch("/api/auth/logout", {
    method: "POST"
  });
}

function fetchPersons(search = "", includeMedia = false) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (includeMedia) {
    params.set("includeMedia", "true");
  }

  return apiFetch(`/api/persons?${params.toString()}`);
}

function createPerson(payload) {
  return apiFetch("/api/persons", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function fetchPublicMemories(personId) {
  return apiFetch(`/api/persons/${encodeURIComponent(personId)}/media`);
}

function uploadMedia(formData) {
  return apiFetch("/api/media", {
    method: "POST",
    body: formData
  });
}

function updateMedia(mediaId, payload) {
  return apiFetch(`/api/media/${encodeURIComponent(mediaId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

function deleteMedia(mediaId) {
  return apiFetch(`/api/media/${encodeURIComponent(mediaId)}`, {
    method: "DELETE"
  });
}
