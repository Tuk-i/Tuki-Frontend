import type { IUsuarioPostDTO } from "@models/IUsuarioPostDTO";
import { user_Post } from "../services/api";
import { saveUser } from "./localStorage";
import { navigate } from "./navigate";
import type { IUsuarioDTO } from "@models/IUsuarioDTO";
const API_URL = import.meta.env.VITE_API_URL_Users_login;

export async function iniciarSesion(credenciales: IUsuarioPostDTO, mensajeError?: HTMLParagraphElement): Promise<void> {
    const {usuario, error} = await user_Post(credenciales,API_URL)

   

    if (usuario) {
    const usuarioSesion: IUsuarioDTO = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      loggedIn: true
    };

    saveUser(usuarioSesion);

    if (usuario) {
        saveUser(usuario);
        if (usuario.rol === "ADMINISTRADOR") {
        navigate("/src/pages/admin/home/home.html");
        } else if (usuario.rol === "CLIENTE") {
        navigate("/src/pages/client/home/home.html");
        }
  } else if (mensajeError) {
    mensajeError.textContent = error?.mensaje || "Error desconocido";
    document.body.appendChild(mensajeError)
  }

}}