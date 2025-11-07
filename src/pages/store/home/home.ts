import type { IUsuarioDTO } from "@models/IUsuarios/IUsuarioDTO"
import type { IUsuarioLogin } from "@models/IUsuarios/IUsuarioLogin"
import type { IUsuarioInputDTO } from "@models/IUsuarios/IUsuarioInputDTO"
import { checkAuthUsers } from "@utils/auth"
import { logoutUser, saveUser } from "@utils/localStorage"
import { updateById } from "services/Metodos/UpdateById"
import type { IErrorDTO } from "@models/IErrorDTO"
const API_URL = import.meta.env.VITE_API_URL_Users


const edtiForm = document.getElementById("form") as HTMLFormElement

const emailInput = document.getElementById("email") as HTMLInputElement
const passwordInput = document.getElementById("password") as HTMLInputElement


edtiForm.addEventListener("submit",async (e:SubmitEvent)=>{
    e.preventDefault()
    const email = emailInput.value
    const password = passwordInput.value
    const mensajeError = document.getElementById("error") as HTMLDivElement

    if (email || password){
        const userData = localStorage.getItem("userData")
        const userDataJson = JSON.parse(userData!)

        const {data: usuario, error} = await updateById<IUsuarioInputDTO, IUsuarioDTO>(
            {email,password}, userDataJson.id,API_URL
        )

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
            }
            saveUser(usuarioSesion)
            mensajeError.classList.add("ocultar");
            alert("Perfil actualizado correctamente");
            emailInput.value = "";
            passwordInput.value = "";

        }
    }else{
        mensajeError.textContent = "No están todos los elementos"
        mensajeError.classList.remove("ocultar")
        return
    }
})

// Salir de la sesión
const buttonLogout = document.getElementById("button_logout") as HTMLButtonElement
buttonLogout.addEventListener('click',()=>{
    logoutUser()
    checkAuthUsers("CLIENTE", "/src/pages/auth/login/login.html")
})

const initPage=()=>{
    checkAuthUsers("CLIENTE",'/src/pages/admin/home/home.html')
    // const user = localStorage.getItem("userData")
    // const h2 = document.createElement("h2")
    // h2.textContent = `Usuario: ${user}`
    // document.body.appendChild(h2)
}

initPage()