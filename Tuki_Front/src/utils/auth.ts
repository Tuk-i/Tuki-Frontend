
import type { Rol } from "@models/IUsuarios/Rol";
import { navigate } from "./navigate"
import type { IUsuarioLogin } from "@models/IUsuarios/IUsuarioLogin";


export const checkAuthUsers = (rol: Rol, route: string)=>{
    const user = localStorage.getItem("userData")

    if (!user){
        // navigate('/src/pages/auth/login/login.html')
        navigate('/src/pages/auth/login/login.html')
        return
    }
    const parseUser: IUsuarioLogin = JSON.parse(user)
    if (parseUser.loggedIn && parseUser.rol != rol){
        navigate(route)
        return
    }
}