import type { IUsuarioInputDTO } from "@models/IUsuarios/IUsuarioInputDTO";
import { Post } from "../api";
import { saveUser } from "../../utils/localStorage";
import { navigate } from "../../utils/navigate";
import type { IUsuarioLogin } from "@models/IUsuarios/IUsuarioLogin";
import type { IErrorDTO } from "@models/IErrorDTO";
import type { IUsuarioDTO } from "@models/IUsuarios/IUsuarioDTO";
const API_URL = import.meta.env.VITE_API_URL_Users_login;

export async function iniciarSesion(credenciales: IUsuarioInputDTO, mensajeError: HTMLDivElement): Promise<void> {
    const { data :usuario, error} = await Post<IUsuarioInputDTO, IUsuarioDTO>(credenciales,API_URL)
    
    mensajeError.innerHTML =""

    if (error){
      const mostrarError: IErrorDTO ={
        mensaje: error.mensaje
      }
      mensajeError.textContent = mostrarError.mensaje
      mensajeError.classList.remove("ocultar")
      return
    }

    if (usuario) {
      const usuarioSesion: IUsuarioLogin = {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        loggedIn: true
      };

      saveUser(usuarioSesion)

      if (usuario.rol === "ADMINISTRADOR") {
        navigate("/src/pages/admin/home/home.html");
        } else if (usuario.rol === "CLIENTE") {
        navigate("/src/pages/store/home/home.html");
        }
    }
  }

  

    // if (usuario) {
    //     saveUser(usuario);
    //     if (usuario.rol === "ADMINISTRADOR") {
    //     navigate("/src/pages/admin/home/home.html");
    //     } else if (usuario.rol === "CLIENTE") {
    //     navigate("/src/pages/client/home/home.html");
    //     }
    //   } else if (mensajeError) {
    // mensajeError.textContent = error?.mensaje || "Error desconocido";
    // document.body.appendChild(mensajeError)
    // }
