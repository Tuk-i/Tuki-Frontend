import { checkAuthUsers } from "@utils/auth"
import { logoutUser } from "@utils/localStorage"

const buttonLogout = document.getElementById("button_logout") as HTMLButtonElement

buttonLogout.addEventListener('click',()=>{
    logoutUser()
    checkAuthUsers("ADMINISTRADOR","/src/pages/auth/login/login.html")
})

const initPage=()=>{
    checkAuthUsers("ADMINISTRADOR","/src/pages/client/home/home.html")
    // const user = localStorage.getItem("userData")
    // const h2 = document.createElement("h2")
    // h2.textContent = `Usuario: ${user}`
    // document.body.appendChild(h2)
}

initPage()