const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

if (isAdminLoggedIn()) {
  window.location.replace("./admin.html");
}

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = (document.getElementById("username")?.value || "").trim();
  const password = (document.getElementById("password")?.value || "").trim();

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    if (loginError) {
      loginError.textContent = "";
    }
    setAdminSession(true);
    window.location.href = "./admin.html";
    return;
  }

  if (loginError) {
    loginError.textContent = "Usuario o contraseña incorrectos.";
  }
});

loginForm?.addEventListener("input", () => {
  if (loginError) {
    loginError.textContent = "";
  }
});
