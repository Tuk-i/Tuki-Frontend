import type { Rol } from "@models/Rol"
import { navigate } from "./navigate"
import type { IUsuarioDTO } from "@models/IUsuarioDTO";


export const checkAuthUsers = (rol: Rol, route: string)=>{
    const user = localStorage.getItem("userData")

    if (!user){
        // navigate('/src/pages/auth/login/login.html')
        navigate(route)
        return
    }
    const parseUser: IUsuarioDTO = JSON.parse(user)
    if (parseUser.loggedIn && parseUser.rol != rol){
        navigate(route)
        return
    }
}


// export const checkAuthUsers = (rol: Rol, route: string): void => {
//   const user = localStorage.getItem("userData");
//   if (!user) {
//     navigate(route);
//     return;
//   }

//   const parseUser: IUsuarioDTO = JSON.parse(user);
//   const noAutorizado = !parseUser.loggedIn || parseUser.rol !== rol;

//   if (noAutorizado) {
//     navigate(route);
//   }
// };
