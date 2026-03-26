const STORAGE_KEYS = {
  adminSession: "cg_admin_session",
  mediaByPerson: "cg_media_by_person"
};

function normalizeStructuredDatabase(rawValue) {
  if (!rawValue || typeof rawValue !== "object") {
    return {};
  }

  const normalized = {};

  Object.entries(rawValue).forEach(([personId, entry]) => {
    if (Array.isArray(entry)) {
      normalized[personId] = {
        id: personId,
        name: "",
        media: entry
      };
      return;
    }

    if (!entry || typeof entry !== "object") {
      return;
    }

    const media = Array.isArray(entry.media)
      ? entry.media
      : Array.isArray(entry.items)
        ? entry.items
        : [];

    normalized[personId] = {
      id: String(entry.id || personId),
      name: typeof entry.name === "string" ? entry.name : "",
      media
    };
  });

  return normalized;
}

function getAdminDatabase() {
  const raw = localStorage.getItem(STORAGE_KEYS.mediaByPerson);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return normalizeStructuredDatabase(parsed);
  } catch {
    return {};
  }
}

function saveAdminDatabase(db) {
  localStorage.setItem(
    STORAGE_KEYS.mediaByPerson,
    JSON.stringify(normalizeStructuredDatabase(db))
  );
}

function getMediaDatabase() {
  const structuredDb = getAdminDatabase();
  return Object.fromEntries(
    Object.entries(structuredDb).map(([personId, entry]) => [
      personId,
      Array.isArray(entry.media) ? entry.media : []
    ])
  );
}

function saveMediaDatabase(db) {
  const structuredDb = getAdminDatabase();
  const nextDb = {};

  Object.entries(db || {}).forEach(([personId, media]) => {
    const current = structuredDb[personId] || { id: personId, name: "", media: [] };
    nextDb[personId] = {
      id: personId,
      name: current.name || "",
      media: Array.isArray(media) ? media : []
    };
  });

  saveAdminDatabase(nextDb);
}

function isAdminLoggedIn() {
  return localStorage.getItem(STORAGE_KEYS.adminSession) === "true";
}

function setAdminSession(value) {
  localStorage.setItem(STORAGE_KEYS.adminSession, value ? "true" : "false");
}
