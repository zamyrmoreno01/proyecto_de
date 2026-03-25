const STORAGE_KEYS = {
  adminSession: "cg_admin_session",
  mediaByPerson: "cg_media_by_person"
};

function getMediaDatabase() {
  const raw = localStorage.getItem(STORAGE_KEYS.mediaByPerson);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveMediaDatabase(db) {
  localStorage.setItem(STORAGE_KEYS.mediaByPerson, JSON.stringify(db));
}

function isAdminLoggedIn() {
  return localStorage.getItem(STORAGE_KEYS.adminSession) === "true";
}

function setAdminSession(value) {
  localStorage.setItem(STORAGE_KEYS.adminSession, value ? "true" : "false");
}
