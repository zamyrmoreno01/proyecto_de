const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

getAdminSession()
  .then(() => {
    window.location.replace("./admin.html");
  })
  .catch(() => {});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = (document.getElementById("username")?.value || "").trim();
  const password = (document.getElementById("password")?.value || "").trim();

  try {
    await loginAdmin({ username, password });
    if (loginError) {
      loginError.textContent = "";
    }
    window.location.href = "./admin.html";
  } catch {
    if (loginError) {
      loginError.textContent = "Usuario o contrasena incorrectos.";
    }
  }
});

loginForm?.addEventListener("input", () => {
  if (loginError) {
    loginError.textContent = "";
  }
});
