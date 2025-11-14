export interface ICategoryDTO {
  id: number
  nombre: string
  descripcion: string
  urlImagen: string | null
}

export interface ICategoryInputDTO {
  nombre: string
  descripcion: string
  urlImagen: string
}