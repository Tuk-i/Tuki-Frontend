import type {Rol} from "./Rol"

export interface IUser{
    email: string
    role: Rol
    loggedIn: boolean
}