import type { IUsuarioLogin } from "@models/IUsuarios/IUsuarioLogin";
import { checkAuthUsers } from "@utils/auth";
import { iniciarSesion } from "services/Metodos/login";

const crearUsuarioBoton = document.getElementById("crearUsuario") as HTMLButtonElement;

crearUsuarioBoton.addEventListener("click", () => {
  window.location.href = "/src/pages/auth/register/register.html";
});


const loginForm = document.getElementById("form") as HTMLFormElement

const emailInput = document.getElementById("email") as HTMLInputElement
const passwordInput = document.getElementById("password") as HTMLInputElement



loginForm.addEventListener("submit", async (e:SubmitEvent)=>{
    e.preventDefault()
    const email = emailInput.value
    const password = passwordInput.value
    const mensajeError = document.getElementById("error") as HTMLDivElement
    
    if (!email || !password){
        mensajeError.textContent = "No están todos los elementos"
        mensajeError.classList.remove("ocultar")
        return
    }

    mensajeError.classList.add("ocultar");
    mensajeError.textContent = "";

    await iniciarSesion({email, password}, mensajeError)
})


// Proteccion de rutas
const initPage=()=>{
    const userData = localStorage.getItem("userData")

    if (userData){
      const user: IUsuarioLogin = JSON.parse(userData)
      if (user.rol === "ADMINISTRADOR"){
        checkAuthUsers("CLIENTE",'/src/pages/admin/home/home.html')
      }else(user.rol === "CLIENTE","/src/pages/client/home/home.html")
    }
}

initPage()


    // const userPost: IUsuarioPostDTO = { email, password };

    // const { usuario, error } = await user_Post(userPost);

    // if (usuario) {
    //     saveUser(usuario);
    //     if (usuario.rol === "ADMINISTRADOR") {
    //     navigate("/src/pages/admin/home/home.html");
    //     } else if (usuario.rol === "CLIENTE") {
    //     navigate("/src/pages/client/home/home.html");
    //     }
    // } else {
    //     const mensajeError = document.getElementById("error") as HTMLParagraphElement;
    //     if (error){
    //         mensajeError.textContent = error.mensaje
    //     }else{
    //         mensajeError.textContent = "Error desconocido"
    //     }
    //     mensajeError.textContent = error?.mensaje || "Error desconocido";
    //     document.body.appendChild(mensajeError)
    // }