import type { IUsuarioDTO } from "@models/IUsuarioDTO"


export const saveUser = (userData: IUsuarioDTO) =>{
        const parse = JSON.stringify(userData)
        localStorage.setItem("userData",parse)
    }

export const logoutUser = ()=>{
    localStorage.removeItem("userData")
}