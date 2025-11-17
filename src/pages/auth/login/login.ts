import type { IUsuarioLogin } from "@models/IUsuarios/IUsuarioLogin";
import { navigate } from "@utils/navigate";
import { iniciarSesion } from "services/Metodos/login";

const crearUsuarioBoton = document.getElementById("crearUsuario") as HTMLButtonElement;

crearUsuarioBoton.addEventListener("click", () => {
  window.location.href = "/src/pages/auth/register/register.html";
});

// Formulario de login
const loginForm = document.getElementById("form") as HTMLFormElement;
const emailInput = document.getElementById("email") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;

// =========================
// Manejo del submit del formulario de Login
// =========================

loginForm.addEventListener("submit", async (e: SubmitEvent) => {
  e.preventDefault();

  const email = emailInput.value;
  const password = passwordInput.value;

  const mensajeError = document.getElementById("error") as HTMLDivElement;

  // =========================
  // Validación básica
  // =========================

  if (!email || !password) {
    mensajeError.textContent = "No están todos los elementos";
    mensajeError.classList.remove("ocultar");
    return;
  }
  mensajeError.classList.add("ocultar");
  mensajeError.textContent = "";

  // =========================
  // Llamada a la lógica de login
  // =========================
  await iniciarSesion({ email, password }, mensajeError);
});


const initPage = () => {
  const userData = localStorage.getItem("userData");

  if (userData) {
    const user: IUsuarioLogin = JSON.parse(userData);

    if (user.rol === "ADMINISTRADOR") {
      navigate("/src/pages/admin/home/home.html");
    }
    else if (user.rol === "CLIENTE") {
      navigate("/src/pages/store/home/home.html");
    }
  }
};

// Ejecuto initPage apenas carga el script
initPage();
