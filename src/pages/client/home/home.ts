import { checkAuthUsers } from "@utils/auth"
import { logoutUser } from "@utils/localStorage"

const buttonLogout = document.getElementById("button_logout") as HTMLButtonElement

buttonLogout.addEventListener('click',()=>{
    logoutUser()
    checkAuthUsers("CLIENTE", "/src/pages/auth/login/login.html")
})

const initPage=()=>{
    checkAuthUsers("CLIENTE","/src/pages/auth/login/login.html")
    // const user = localStorage.getItem("userData")
    // const h2 = document.createElement("h2")
    // h2.textContent = `Usuario: ${user}`
    // document.body.appendChild(h2)
}

initPage()