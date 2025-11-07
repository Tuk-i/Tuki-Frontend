import { checkAuthUsers } from "@utils/auth"
import { logoutUser } from "@utils/localStorage"

const buttonLogout = document.getElementById("button_logout") as HTMLButtonElement

buttonLogout.addEventListener('click',()=>{
    logoutUser()
    checkAuthUsers("ADMINISTRADOR","/src/pages/auth/login/login.html")
})

const initPage=()=>{
    checkAuthUsers("ADMINISTRADOR","/src/pages/store/home/home.html")
}

initPage()