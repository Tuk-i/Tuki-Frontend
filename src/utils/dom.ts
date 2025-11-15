export const queryRequiredElement = <T extends Element>(
  selector: string,
  parent: ParentNode = document,
): T => {
  const element = parent.querySelector<T>(selector)
  if (!element) {
    throw new Error(`No se encontró el elemento requerido: ${selector}`)
  }
  return element
}

export const requireElementById = <T extends HTMLElement>(id: string, root: Document = document): T => {
  const element = root.getElementById(id)
  if (!element) {
    throw new Error(`No se encontró el elemento con id "${id}" en el DOM`)
  }
  return element as T
}
