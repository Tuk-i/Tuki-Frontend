import type { IErrorDTO } from "@models/IErrorDTO";

// Get
export const Get = async <IDTO>(
  API_URL: string
): Promise<{ data?: IDTO; error?: IErrorDTO }> => {
  try {
    const respuesta = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await respuesta.json();

    if (!respuesta.ok || "mensaje" in data) {
      return { error: data };
    }

    return { data };
  } catch (error) {
    return { error: { mensaje: "Error de conexión con el servidor" } };
  }
};


// Post
export const Post = async <IPostDTO, IDTO> (
  frontendDTO: IPostDTO, API_URL: string
): Promise<{ data?: IDTO; error?: IErrorDTO }> => {
  try {
    const respuesta = await fetch(API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(frontendDTO),
    })

    const data = await respuesta.json()

    if (!respuesta.ok || "mensaje" in data) {
      
      return { error: data }
    }

    return { data }
  } catch (error) {
    return { error: { mensaje: "Error de conexión con el servidor" } }
  }
}

// Put
export const Put = async <IInputDTO, IDTO>(
  frontendDTO: IInputDTO, API_URL: string
): Promise<{ data?: IDTO; error?: IErrorDTO }> =>{
  try{
    const respuesta = await fetch(API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(frontendDTO)
      })

    const data = await respuesta.json()
    
    if (!respuesta.ok || "mensaje" in data) {
      
      return { error: data }
    }

    return {data}

  } catch (error) {
    return { error: { mensaje: "Error de conexión con el servidor" } };
  }
}

// PATCH
export const Patch = async <IDTO>(
  API_URL: string
): Promise<{ data?: IDTO; error?: IErrorDTO }> => {
  try {
    const respuesta = await fetch(API_URL, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await respuesta.json();

    if (!respuesta.ok || "mensaje" in data) {
      return { error: data };
    }

    return { data };
  } catch (error) {
    return { error: { mensaje: "Error de conexión con el servidor" } };
  }
};

export const Delete = async (
  API_URL: string
): Promise<{ data?: string; error?: IErrorDTO }> => {
  try {
    const respuesta = await fetch(API_URL, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await respuesta.text();

    if (!respuesta.ok || data.includes("mensaje")) {
      return { error: { mensaje: data } };
    }

    return { data };
  } catch (error) {
    return { error: { mensaje: "Error de conexión con el servidor" } };
  }
};
