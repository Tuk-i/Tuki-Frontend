import type { Rol } from "./Rol"

export interface IUsuarioDTO{
    id: number
    nombre: string
    email: string
    rol: Rol
}
