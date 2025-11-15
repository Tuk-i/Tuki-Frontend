import { Get, Post } from "../../../services/api.ts"
import { updateById } from "../../../services/Metodos/UpdateById"
import { checkAuthUsers } from "@utils/auth"
import { readEnvOr } from "@utils/env"
import { queryRequiredElement } from "@utils/dom"
import { createNotificationController } from "@utils/notification"
import { normalizeNumber, normalizeString, unwrapCollection } from "@utils/normalize"
import { logoutUser } from "@utils/localStorage"
import type { ICategoryDTO, ICategoryInputDTO } from "@models/Icategoria"

type ModalMode = "create" | "edit"

const CATEGORIES_API_URL = readEnvOr("VITE_API_URL_CATEGORIES", "")

const DEFAULT_CATEGORY_IMAGE = "/src/public/images/dragoncito.png"

const categoriesTableBody = queryRequiredElement<HTMLTableSectionElement>("#categories-table-body")
const notification = queryRequiredElement<HTMLDivElement>("#notification")
const categoryModal = queryRequiredElement<HTMLDialogElement>("#category-modal")
const categoryForm = queryRequiredElement<HTMLFormElement>("#category-form")
const categoryModalTitle = queryRequiredElement<HTMLHeadingElement>("#category-modal-title")
const categoryModalDescription = queryRequiredElement<HTMLParagraphElement>("#category-modal-description")
const categoryNameInput = queryRequiredElement<HTMLInputElement>("#category-name")
const categoryDescriptionInput = queryRequiredElement<HTMLTextAreaElement>("#category-description")
const categoryImageInput = queryRequiredElement<HTMLInputElement>("#category-image")
const categoryFormError = queryRequiredElement<HTMLDivElement>("#category-form-error")
const categorySubmitButton = queryRequiredElement<HTMLButtonElement>("#category-submit-button")
const categoryCancelButton = queryRequiredElement<HTMLButtonElement>("#category-cancel-button")
const categoryModalClose = queryRequiredElement<HTMLButtonElement>("#category-modal-close")
const newCategoryButton = queryRequiredElement<HTMLButtonElement>("#new-category-button")

const loadingState = document.getElementById("loading-state") as HTMLDivElement | null
const errorState = document.getElementById("error-state") as HTMLDivElement | null
const errorMessage = document.getElementById("error-message") as HTMLParagraphElement | null
const retryButton = document.getElementById("retry-button") as HTMLButtonElement | null
const logoutButton = document.getElementById("logout-button") as HTMLButtonElement | null

const { reset: resetNotification, show: showNotification } = createNotificationController(notification)

let categories: ICategoryDTO[] = []
let modalMode: ModalMode = "create"
let editingCategoryId: number | null = null

const showLoading = () => {
  if (loadingState) {
    loadingState.hidden = false
  }
}

const hideLoading = () => {
  if (loadingState) {
    loadingState.hidden = true
  }
}

const showErrorState = (message: string) => {
  if (errorState && errorMessage) {
    errorMessage.textContent = message
    errorState.hidden = false
    return
  }
  showNotification(message, "error")
}

const hideErrorState = () => {
  if (errorState) {
    errorState.hidden = true
  }
}

const clearFormError = () => {
  categoryFormError.textContent = ""
  categoryFormError.classList.remove("modal__error--visible")
}

const showFormError = (message: string) => {
  categoryFormError.textContent = message
  categoryFormError.classList.add("modal__error--visible")
}

const setFormLoading = (loading: boolean) => {
  const loadingText = modalMode === "edit" ? "Guardando..." : "Creando..."
  const idleText = modalMode === "edit" ? "Guardar cambios" : "Crear categoría"

  categorySubmitButton.disabled = loading
  categoryCancelButton.disabled = loading
  categorySubmitButton.textContent = loading ? loadingText : idleText
}

const resetForm = () => {
  categoryForm.reset()
  categoryImageInput.setCustomValidity("")
  clearFormError()
}

const setModalCopy = () => {
  if (modalMode === "edit") {
    categoryModalTitle.textContent = "Editar categoría"
    categoryModalDescription.textContent = "Actualiza la información de la categoría seleccionada."
  } else {
    categoryModalTitle.textContent = "Nueva categoría"
    categoryModalDescription.textContent = "Completa la información para registrar una nueva categoría."
  }

  const idleText = modalMode === "edit" ? "Guardar cambios" : "Crear categoría"
  categorySubmitButton.textContent = idleText
}

const closeModal = () => {
  if (categoryModal.open) {
    categoryModal.close()
  }
  modalMode = "create"
  editingCategoryId = null
  resetForm()
  setModalCopy()
  categoryCancelButton.disabled = false
  categorySubmitButton.disabled = false
}

const openModal = (mode: ModalMode, category?: ICategoryDTO) => {
  modalMode = mode
  setModalCopy()
  clearFormError()

  if (mode === "edit" && category) {
    editingCategoryId = category.id
    categoryNameInput.value = category.nombre
    categoryDescriptionInput.value = category.descripcion
    categoryImageInput.value = category.urlImagen && category.urlImagen.trim().length > 0 ? category.urlImagen : ""
  } else {
    editingCategoryId = null
    resetForm()
  }

  categoryModal.showModal()
}

const parseCategoryId = (value: unknown): number | null => {
  const normalized = normalizeNumber(value)
  if (normalized === undefined || !Number.isInteger(normalized) || normalized < 0) {
    return null
  }
  return normalized
}

const adaptCategory = (value: unknown): ICategoryDTO | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const id = parseCategoryId(record.id ?? record.ID ?? record.identifier)
  const nombre = normalizeString(record.nombre ?? record.name)
  const descripcion = normalizeString(record.descripcion ?? record.description)
  const urlImagen = normalizeString(
    record.urlImagen ?? record.imagen ?? record.image ?? record.imageUrl ?? record.imagenUrl ?? record.foto,
  )

  if (id === null || !nombre || !descripcion) {
    return null
  }

  return {
    id,
    nombre,
    descripcion,
    urlImagen: urlImagen ?? null,
  }
}

const adaptCategories = (payload: unknown): ICategoryDTO[] => {
  const collection = unwrapCollection(payload, { unwrapNestedObject: true })
  return collection.map((item) => adaptCategory(item)).filter((item): item is ICategoryDTO => Boolean(item))
}

const createCategoryRow = (category: ICategoryDTO): HTMLTableRowElement => {
  const row = document.createElement("tr")

  const idHeader = document.createElement("th")
  idHeader.scope = "row"
  idHeader.textContent = String(category.id)

  const thumbnailCell = document.createElement("td")
  const thumbnailWrapper = document.createElement("div")
  thumbnailWrapper.className = "categories-table__thumbnail-wrapper"
  const thumbnail = document.createElement("img")
  thumbnail.className = "categories-table__thumbnail"
  thumbnail.alt = `Imagen representativa de ${category.nombre}`
  thumbnail.decoding = "async"
  thumbnail.loading = "lazy"
  thumbnail.src = (category.urlImagen && category.urlImagen.trim().length > 0) ? category.urlImagen : DEFAULT_CATEGORY_IMAGE
  thumbnail.addEventListener("error", () => {
    if (thumbnail.dataset.fallbackApplied === "true") {
      return
    }
    thumbnail.dataset.fallbackApplied = "true"
    thumbnail.src = DEFAULT_CATEGORY_IMAGE
  })
  thumbnailWrapper.append(thumbnail)
  thumbnailCell.append(thumbnailWrapper)

  const nameCell = document.createElement("td")
  nameCell.className = "categories-table__name"
  nameCell.textContent = category.nombre

  const descriptionCell = document.createElement("td")
  descriptionCell.className = "categories-table__description"
  descriptionCell.textContent = category.descripcion

  const actionsCell = document.createElement("td")
  const actionsContainer = document.createElement("div")
  actionsContainer.className = "categories-actions"

  const editButton = document.createElement("button")
  editButton.type = "button"
  editButton.className = "categories-actions__button"
  editButton.textContent = "Editar"
  editButton.addEventListener("click", () => {
    openModal("edit", category)
  })

  const deleteButton = document.createElement("button")
  deleteButton.type = "button"
  deleteButton.className = "categories-actions__button categories-actions__button--danger"
  deleteButton.textContent = "Eliminar"
  deleteButton.addEventListener("click", () => {
    void handleDeleteCategory(category)
  })

  actionsContainer.append(editButton, deleteButton)
  actionsCell.append(actionsContainer)

  row.append(idHeader, thumbnailCell, nameCell, descriptionCell, actionsCell)
  return row
}

const renderCategories = (items: ICategoryDTO[]) => {
  categoriesTableBody.innerHTML = ""

  if (items.length === 0) {
    const emptyRow = document.createElement("tr")
    const emptyCell = document.createElement("td")
    emptyCell.colSpan = 5
    emptyCell.className = "categories-empty"
    emptyCell.textContent = "Aún no hay categorías registradas. Crea una nueva para empezar."
    emptyRow.append(emptyCell)
    categoriesTableBody.append(emptyRow)
    return
  }

  const fragment = document.createDocumentFragment()
  for (const category of items) {
    fragment.append(createCategoryRow(category))
  }
  categoriesTableBody.append(fragment)
}

const parseDeleteMessage = (raw: string): string => {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ""
  }

  try {
    const parsed = JSON.parse(trimmed) as { mensaje?: unknown }
    if (parsed && typeof parsed === "object" && parsed.mensaje && typeof parsed.mensaje === "string") {
      return parsed.mensaje
    }
  } catch (error) {
    console.warn("No se pudo interpretar la respuesta de eliminación como JSON", error)
  }

  return trimmed
}

const handleDeleteCategory = async (category: ICategoryDTO) => {
  const confirmation = window.confirm(
    `¿Deseas eliminar la categoría "${category.nombre}"? Esta acción no se puede deshacer.`,
  )

  if (!confirmation) {
    return
  }

  if (!CATEGORIES_API_URL) {
    showNotification("No se configuró la URL de categorías.", "error")
    return
  }

  showNotification("Eliminando categoría...", "info")

  try {
    const response = await fetch(`${CATEGORIES_API_URL}/${category.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const payload = await response.text()
    const message = parseDeleteMessage(payload) || "Categoría eliminada correctamente."

    if (!response.ok) {
      throw new Error(message)
    }

    showNotification(message, "success")
    await fetchCategories()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ocurrió un error al eliminar la categoría."
    showNotification(message, "error")
  }
}

const fetchCategories = async () => {
  if (!CATEGORIES_API_URL) {
    showErrorState("No se configuró la URL para obtener las categorías.")
    renderCategories([])
    return
  }

  showLoading()
  hideErrorState()

  try {
    const { data, error } = await Get<unknown>(CATEGORIES_API_URL)

    if (error) {
      throw new Error(error?.mensaje ?? "No se pudieron obtener las categorías.")
    }

    const adapted = adaptCategories(data)
    categories = adapted
    renderCategories(categories)

    if (categories.length === 0) {
      showNotification("No se encontraron categorías activas. Crea una nueva para comenzar.", "info")
    }
  } catch (error) {
    console.error("Error al cargar las categorías", error)
    const message = error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar las categorías."
    showErrorState(message)
  } finally {
    hideLoading()
  }
}

const validateImageUrl = (value: string): boolean => {
  try {
    new URL(value)
    return true
  } catch (error) {
    console.warn("URL de imagen inválida", error)
    return false
  }
}

const handleFormSubmit = async (event: SubmitEvent) => {
  event.preventDefault()

  clearFormError()
  resetNotification()

  if (!categoryForm.reportValidity()) {
    return
  }

  const nombre = categoryNameInput.value.trim()
  const descripcion = categoryDescriptionInput.value.trim()
  const urlImagen = categoryImageInput.value.trim()

  if (!nombre || !descripcion || !urlImagen) {
    showFormError("Completa todos los campos requeridos.")
    return
  }

  if (!validateImageUrl(urlImagen)) {
    categoryImageInput.setCustomValidity("Ingresa una URL válida para la imagen.")
    categoryImageInput.reportValidity()
    categoryImageInput.setCustomValidity("")
    return
  }

  if (!CATEGORIES_API_URL) {
    showFormError("No se configuró la URL de categorías.")
    return
  }

  const payload: ICategoryInputDTO = {
    nombre,
    descripcion,
    urlImagen,
  }

  setFormLoading(true)

  try {
    if (modalMode === "edit" && editingCategoryId !== null) {
      const { data, error } = await updateById<ICategoryInputDTO, ICategoryDTO>(
        payload,
        editingCategoryId,
        CATEGORIES_API_URL,
      )

      if (error || !data) {
        throw new Error(error?.mensaje ?? "No se pudo actualizar la categoría.")
      }

      showNotification("Categoría actualizada correctamente.", "success")
    } else {
      const { data, error } = await Post<ICategoryInputDTO, ICategoryDTO>(payload, CATEGORIES_API_URL)

      if (error || !data) {
        throw new Error(error?.mensaje ?? "No se pudo crear la categoría.")
      }

      showNotification("Categoría creada correctamente.", "success")
    }

    closeModal()
    await fetchCategories()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ocurrió un error al guardar la categoría."
    showFormError(message)
  } finally {
    setFormLoading(false)
  }
}

const initCategoriesPage = () => {
  checkAuthUsers("ADMINISTRADOR", "/src/pages/auth/login/login.html")

  newCategoryButton.addEventListener("click", () => {
    resetForm()
    openModal("create")
  })

  categoryCancelButton.addEventListener("click", () => {
    closeModal()
  })

  categoryModalClose.addEventListener("click", () => {
    closeModal()
  })

  categoryModal.addEventListener("cancel", (event) => {
    event.preventDefault()
    closeModal()
  })

  categoryForm.addEventListener("submit", (event) => {
    void handleFormSubmit(event)
  })

  if (retryButton) {
    retryButton.addEventListener("click", () => {
      void fetchCategories()
    })
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logoutUser()
      checkAuthUsers("ADMINISTRADOR", "/src/pages/auth/login/login.html")
    })
  }

  void fetchCategories()
}

initCategoriesPage()