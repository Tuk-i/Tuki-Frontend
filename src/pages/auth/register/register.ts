import { user_Post } from "services/api";
import { iniciarSesion } from "@utils/login";
const API_URL = import.meta.env.VITE_API_URL_Users_create;

const iniciarSesionBoton = document.getElementById("iniciarSesion") as HTMLButtonElement;

iniciarSesionBoton.addEventListener("click", () => {
  window.location.href = "src/pages/auth/login/login.html";
});


const loginForm = document.getElementById("form") as HTMLFormElement

const emailInput = document.getElementById("email") as HTMLInputElement
const passwordInput = document.getElementById("password") as HTMLInputElement


loginForm.addEventListener("submit", async (e:SubmitEvent)=>{
    e.preventDefault()
    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()
    const mensajeError = document.createElement("p") as HTMLParagraphElement;

    if (!email || !password){
        mensajeError.textContent = "No están todos los elementos"
        return
    }

    
    const { usuario, error } = await user_Post({email, password},API_URL);

    if (usuario){
        await iniciarSesion({email, password}, mensajeError)
    }else{
        const mensajeError = document.getElementById("error") as HTMLParagraphElement;
        // if (error){
        //     mensajeError.textContent = error.mensaje
        // }else{
        //     mensajeError.textContent = "Error desconocido"
        // }
        mensajeError.textContent = error?.mensaje || "Error desconocido";
        document.body.appendChild(mensajeError)
    }
})