import type { IUsuarioDTO } from "@models/IUsuarios/IUsuarioDTO"
import type { IUsuarioLogin } from "@models/IUsuarios/IUsuarioLogin"


export const saveUser = (userData: IUsuarioDTO) =>{
        const sesionUsuario: IUsuarioLogin = {
            id: userData.id,
            nombre: userData.nombre,
            email: userData.email,
            rol: userData.rol,
            loggedIn: true
        }
        const parse = JSON.stringify(sesionUsuario)
        localStorage.setItem("userData",parse)
    }

export const logoutUser = ()=>{
    localStorage.removeItem("userData")
}