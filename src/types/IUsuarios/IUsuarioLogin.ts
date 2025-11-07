import type { Rol } from "./Rol"

export interface IUsuarioLogin{
    id: number
    nombre: string
    email: string
    rol: Rol
    loggedIn: boolean
}
