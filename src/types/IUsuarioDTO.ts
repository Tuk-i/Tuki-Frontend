import type { Rol } from "./Rol"

export interface IUsuarioDTO{
    id: number
    email: string
    rol: Rol
    loggedIn: boolean
}
