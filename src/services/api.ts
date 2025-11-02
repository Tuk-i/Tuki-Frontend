import type { IErrorDTO } from "@models/IErrorDTO";
import type { IUsuarioDTO } from "@models/IUsuarioDTO";
import type { IUsuarioPostDTO } from "@models/IUsuarioPostDTO";



export const user_Post = async (
  credenciales: IUsuarioPostDTO, API_URL: string
): Promise<{ usuario?: IUsuarioDTO; error?: IErrorDTO }> => {
  try {
    const respuesta = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credenciales),
    });

    const data = await respuesta.json();

    if (!respuesta.ok || "mensaje" in data) {
      return { error: data };
    }

    return { usuario: data };
  } catch (error) {
    console.error(`Error: ${error}`);
    return { error: { mensaje: "Error de conexión con el servidor" } };
  }
};
