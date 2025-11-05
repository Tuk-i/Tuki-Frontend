import type { Rol } from "./Rol"

export interface IUsuarioLogin{
    id: number
    email: string
    rol: Rol
    loggedIn: boolean
}
