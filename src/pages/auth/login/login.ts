import { iniciarSesion } from "@utils/login.ts";

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
    const mensajeError = document.createElement("p") as HTMLParagraphElement



    if (!email || !password){
        mensajeError.textContent = "No están todos los elementos"
        return
    }

    await iniciarSesion({email, password}, mensajeError)
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

})
