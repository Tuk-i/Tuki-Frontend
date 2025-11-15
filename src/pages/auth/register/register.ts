import { Post } from "services/api";
import { iniciarSesion } from "services/Metodos/login";
import type { IErrorDTO } from "@models/IErrorDTO";
import type { IUsuarioInputDTO } from "@models/IUsuarios/IUsuarioInputDTO";
import type { IUsuarioDTO } from "@models/IUsuarios/IUsuarioDTO";
const API_URL = import.meta.env.VITE_API_URL_Users_create;

const iniciarSesionBoton = document.getElementById("iniciarSesion") as HTMLButtonElement;

iniciarSesionBoton.addEventListener("click", () => {
  window.location.href = "/src/pages/auth/login/login.html";
});


const loginForm = document.getElementById("form") as HTMLFormElement

const nameInput = document.getElementById("name") as HTMLInputElement
const emailInput = document.getElementById("email") as HTMLInputElement
const passwordInput = document.getElementById("password") as HTMLInputElement


loginForm.addEventListener("submit", async (e:SubmitEvent)=>{
    e.preventDefault()
    const nombre = nameInput.value.trim()
    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()
    const mensajeError = document.getElementById("error") as HTMLDivElement
    

    if (!email || !password || !nombre){
        mensajeError.textContent = "No están todos los elementos"
        mensajeError.classList.remove("ocultar")
        return
    }


    mensajeError.classList.add("ocultar");
    mensajeError.textContent = "";
    const { data :usuario, error} = await Post<IUsuarioInputDTO, IUsuarioDTO>({nombre, email, password},API_URL);

    if (error){
          const mostrarError: IErrorDTO ={
            mensaje: error.mensaje
          }
          mensajeError.textContent = mostrarError.mensaje
          mensajeError.classList.remove("ocultar")
          return
        }

    if (usuario){
        mensajeError.classList.add("ocultar");
        mensajeError.textContent = "";
        await iniciarSesion({email, password}, mensajeError)
    }
    
})