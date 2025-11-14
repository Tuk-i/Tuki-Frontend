export interface IProductDTO {
  id: number
  nombre: string
  descripcion: string
  precio: number
  stock: number
  urlImagen: string | null
  categoriaId: number | null
  categoriaNombre: string
  disponible: boolean
}

export interface IProductInputDTO {
  nombre: string
  descripcion: string
  precio: number
  stock: number
  urlImagen: string
  categoriaId: number
}