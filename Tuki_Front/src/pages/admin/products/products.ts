import { Get, Post } from "../../../services/api.ts"
import { updateById } from "../../../services/Metodos/UpdateById"
import { checkAuthUsers } from "@utils/auth"
import { logoutUser } from "@utils/localStorage"
import type { ICategoryDTO } from "@models/Icategoria"
import type { IProductDTO, IProductInputDTO } from "@models/IProduct"

type ModalMode = "create" | "edit"
type NotificationVariant = "success" | "error" | "info"

type EnvRecord = { [key: string]: string | undefined }

type ProductRecord = Record<string, unknown>

type AvailabilityChangeResult = {
  success: boolean
  message?: string
}

const envRecord = ((import.meta as unknown as { env?: EnvRecord }).env) ?? {}

const PRODUCTS_API_URL = envRecord.VITE_API_URL_PRODUCTS ?? ""
const CATEGORIES_API_URL = envRecord.VITE_API_URL_CATEGORIES ?? ""

const DEFAULT_PRODUCT_IMAGE = "/src/public/images/dragoncito.png"
const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
})

const getElement = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`No se encontró el elemento requerido: ${selector}`)
  }
  return element
}

const productsTableBody = getElement<HTMLTableSectionElement>("#products-table-body")
const notification = getElement<HTMLDivElement>("#notification")
const productModal = getElement<HTMLDialogElement>("#product-modal")
const productForm = getElement<HTMLFormElement>("#product-form")
const productModalTitle = getElement<HTMLHeadingElement>("#product-modal-title")
const productModalDescription = getElement<HTMLParagraphElement>("#product-modal-description")
const productNameInput = getElement<HTMLInputElement>("#product-name")
const productDescriptionInput = getElement<HTMLTextAreaElement>("#product-description")
const productPriceInput = getElement<HTMLInputElement>("#product-price")
const productStockInput = getElement<HTMLInputElement>("#product-stock")
const productCategorySelect = getElement<HTMLSelectElement>("#product-category")
const productImageInput = getElement<HTMLInputElement>("#product-image")
const productAvailableInput = getElement<HTMLInputElement>("#product-available")
const productFormError = getElement<HTMLDivElement>("#product-form-error")
const productSubmitButton = getElement<HTMLButtonElement>("#product-submit-button")
const productCancelButton = getElement<HTMLButtonElement>("#product-cancel-button")
const productModalClose = getElement<HTMLButtonElement>("#product-modal-close")
const newProductButton = getElement<HTMLButtonElement>("#new-product-button")

const loadingState = document.getElementById("loading-state") as HTMLDivElement | null
const errorState = document.getElementById("error-state") as HTMLDivElement | null
const errorMessage = document.getElementById("error-message") as HTMLParagraphElement | null
const retryButton = document.getElementById("retry-button") as HTMLButtonElement | null
const logoutButton = document.getElementById("logout-button") as HTMLButtonElement | null

let products: IProductDTO[] = []
let categories: ICategoryDTO[] = []
let modalMode: ModalMode = "create"
let editingProductId: number | null = null
let editingInitialAvailability = true
let pendingCategorySelection: { id: number | null; name: string } | null = null

const resetNotification = () => {
  notification.textContent = ""
  notification.classList.remove(
    "notification--visible",
    "notification--success",
    "notification--error",
    "notification--info",
  )
}

const showNotification = (message: string, variant: NotificationVariant) => {
  notification.textContent = message
  notification.classList.remove("notification--success", "notification--error", "notification--info")
  notification.classList.add("notification--visible", `notification--${variant}`)
}

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
  productFormError.textContent = ""
  productFormError.classList.remove("modal__error--visible")
}

const showFormError = (message: string) => {
  productFormError.textContent = message
  productFormError.classList.add("modal__error--visible")
}

const setFormLoading = (loading: boolean) => {
  const loadingText = modalMode === "edit" ? "Guardando..." : "Creando..."
  const idleText = modalMode === "edit" ? "Guardar cambios" : "Crear producto"

  productSubmitButton.disabled = loading
  productCancelButton.disabled = loading
  productSubmitButton.textContent = loading ? loadingText : idleText
}

const resetForm = () => {
  productForm.reset()
  productImageInput.setCustomValidity("")
  productPriceInput.setCustomValidity("")
  productStockInput.setCustomValidity("")
  productCategorySelect.setCustomValidity("")
  productAvailableInput.checked = true
  pendingCategorySelection = null
  clearFormError()
}

const setModalCopy = () => {
  if (modalMode === "edit") {
    productModalTitle.textContent = "Editar producto"
    productModalDescription.textContent = "Actualiza la información del producto seleccionado."
  } else {
    productModalTitle.textContent = "Nuevo producto"
    productModalDescription.textContent = "Completa los datos para registrar un nuevo producto en el catálogo."
  }

  const idleText = modalMode === "edit" ? "Guardar cambios" : "Crear producto"
  productSubmitButton.textContent = idleText
}

const closeModal = () => {
  if (productModal.open) {
    productModal.close()
  }
  modalMode = "create"
  editingProductId = null
  editingInitialAvailability = true
  resetForm()
  setModalCopy()
  productCancelButton.disabled = false
  productSubmitButton.disabled = false
}

const applyCategorySelection = (categoryId: number | null, categoryName: string): boolean => {
  if (categoryId !== null) {
    const option = productCategorySelect.querySelector(`option[value="${categoryId}"]`)
    if (option) {
      productCategorySelect.value = String(categoryId)
      return true
    }
  }

  const matchedCategory = categories.find((category) => category.nombre === categoryName)
  if (matchedCategory) {
    productCategorySelect.value = String(matchedCategory.id)
    return true
  }

  productCategorySelect.value = ""
  return false
}

const ensureCategorySelected = (categoryId: number | null, categoryName: string) => {
  if (!applyCategorySelection(categoryId, categoryName)) {
    pendingCategorySelection = { id: categoryId, name: categoryName }
  } else {
    pendingCategorySelection = null
  }
}

const openModal = (mode: ModalMode, product?: IProductDTO) => {
  modalMode = mode
  setModalCopy()
  clearFormError()

  if (mode === "edit" && product) {
    editingProductId = product.id
    editingInitialAvailability = product.disponible
    productNameInput.value = product.nombre
    productDescriptionInput.value = product.descripcion
    productPriceInput.value = Number.isFinite(product.precio) ? String(product.precio) : ""
    productStockInput.value = Number.isFinite(product.stock) ? String(product.stock) : ""
    productImageInput.value = product.urlImagen ?? ""
    productAvailableInput.checked = product.disponible
    ensureCategorySelected(product.categoriaId, product.categoriaNombre)
  } else {
    editingProductId = null
    editingInitialAvailability = true
    resetForm()
  }

  productModal.showModal()
}

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

const parseInteger = (value: unknown): number | null => {
  const parsed = parseNumber(value)
  if (parsed === null) {
    return null
  }
  const integer = Math.trunc(parsed)
  return Number.isFinite(integer) ? integer : null
}

const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value
  }
  if (typeof value === "number") {
    if (value === 1) return true
    if (value === 0) return false
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (!normalized) {
      return null
    }
    if (["true", "activo", "activa", "disponible", "habilitado", "habilitada", "sí", "si", "1"].includes(normalized)) {
      return true
    }
    if (["false", "inactivo", "inactiva", "no disponible", "deshabilitado", "deshabilitada", "no", "0"].includes(normalized)) {
      return false
    }
  }
  return null
}

const parseId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed
    }
  }
  return null
}

const readString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

const unwrapCollection = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const candidates = [
      "data",
      "items",
      "results",
      "content",
      "productos",
      "producto",
      "records",
    ]
    for (const key of candidates) {
      const candidate = record[key]
      if (Array.isArray(candidate)) {
        return candidate
      }
      if (candidate && typeof candidate === "object") {
        return [candidate]
      }
    }
  }
  return []
}

const adaptProduct = (value: unknown): IProductDTO | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as ProductRecord

  const id = parseId(record.id ?? record.ID ?? record.productId ?? record.identifier)
  if (id === null) {
    return null
  }

  const nombre = readString(record.nombre ?? record.name ?? record.titulo) ?? "Producto sin nombre"
  const descripcion =
    readString(record.descripcion ?? record.description ?? record.detalle ?? record.resumen) ?? "Sin descripción"
  const precio = parseNumber(record.precio ?? record.price ?? record.costo ?? record.valor) ?? 0
  const stock = parseInteger(record.stock ?? record.existencia ?? record.inventory ?? record.cantidad) ?? 0
  const urlImagen =
    readString(record.urlImagen ?? record.imageUrl ?? record.image ?? record.imagen ?? record.imagenUrl ?? record.foto) ?? null

  const categoriaId =
    parseId(
      record.categoriaId ??
        record.categoryId ??
        (record.categoria && (record.categoria as ProductRecord).id) ??
        (record.categoria && (record.categoria as ProductRecord).categoriaId) ??
        (record.category && (record.category as ProductRecord).id) ??
        (record.category && (record.category as ProductRecord).categoryId),
    )

  const categoriaNombre =
    readString(
      record.categoriaNombre ??
        record.categoria ??
        record.category ??
        (record.categoria && (record.categoria as ProductRecord).nombre) ??
        (record.categoria && (record.categoria as ProductRecord).name) ??
        (record.category && (record.category as ProductRecord).nombre) ??
        (record.category && (record.category as ProductRecord).name),
    ) ?? "Sin categoría"

  const eliminado = parseBoolean(record.eliminado ?? record.deleted ?? record.isDeleted)
  let disponible = parseBoolean(record.disponible ?? record.available ?? record.activo ?? record.active)

  if (disponible === null && eliminado !== null) {
    disponible = !eliminado
  }

  if (disponible === null) {
    disponible = stock > 0
  }

  return {
    id,
    nombre,
    descripcion,
    precio,
    stock,
    urlImagen,
    categoriaId,
    categoriaNombre,
    disponible,
  }
}

const adaptProducts = (payload: unknown): IProductDTO[] => {
  const collection = unwrapCollection(payload)
  return collection.map((item) => adaptProduct(item)).filter((item): item is IProductDTO => Boolean(item))
}

const adaptCategories = (payload: unknown): ICategoryDTO[] => {
  const collection = unwrapCollection(payload)
  return collection
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }
      const record = item as Record<string, unknown>
      const id = parseId(record.id ?? record.ID ?? record.identifier)
      const nombre = readString(record.nombre ?? record.name ?? record.titulo)
      const descripcion = readString(record.descripcion ?? record.description ?? record.detalle) ?? ""
      const urlImagen =
        readString(record.urlImagen ?? record.imagen ?? record.image ?? record.imageUrl ?? record.imagenUrl ?? record.foto) ?? null

      if (id === null || !nombre) {
        return null
      }

      return { id, nombre, descripcion, urlImagen }
    })
    .filter((item): item is ICategoryDTO => Boolean(item))
}

const populateCategorySelect = () => {
  const currentValue = productCategorySelect.value
  productCategorySelect.innerHTML = ""

  const placeholder = document.createElement("option")
  placeholder.value = ""
  placeholder.textContent = "Selecciona una categoría"
  placeholder.disabled = true
  placeholder.selected = true
  productCategorySelect.append(placeholder)

  for (const category of categories) {
    const option = document.createElement("option")
    option.value = String(category.id)
    option.textContent = category.nombre
    productCategorySelect.append(option)
  }

  if (productModal.open && pendingCategorySelection) {
    if (applyCategorySelection(pendingCategorySelection.id, pendingCategorySelection.name)) {
      pendingCategorySelection = null
    }
  } else if (currentValue && productCategorySelect.querySelector(`option[value="${currentValue}"]`)) {
    productCategorySelect.value = currentValue
  }

  const hasCategories = categories.length > 0
  productCategorySelect.disabled = !hasCategories
  newProductButton.disabled = !hasCategories
}

const getCategoryNameById = (categoryId: number | null, fallback: string): string => {
  if (categoryId === null) {
    return fallback
  }
  const match = categories.find((category) => category.id === categoryId)
  return match ? match.nombre : fallback
}

const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) {
    return currencyFormatter.format(0)
  }
  return currencyFormatter.format(value)
}

const createProductRow = (product: IProductDTO): HTMLTableRowElement => {
  const row = document.createElement("tr")

  const idHeader = document.createElement("th")
  idHeader.scope = "row"
  idHeader.textContent = String(product.id)

  const thumbnailCell = document.createElement("td")
  const thumbnailWrapper = document.createElement("div")
  thumbnailWrapper.className = "products-table__thumbnail-wrapper"
  const thumbnail = document.createElement("img")
  thumbnail.className = "products-table__thumbnail"
  thumbnail.alt = `Imagen representativa de ${product.nombre}`
  thumbnail.decoding = "async"
  thumbnail.loading = "lazy"
  thumbnail.src = product.urlImagen && product.urlImagen.trim().length > 0 ? product.urlImagen : DEFAULT_PRODUCT_IMAGE
  thumbnail.addEventListener("error", () => {
    if (thumbnail.dataset.fallbackApplied === "true") {
      return
    }
    thumbnail.dataset.fallbackApplied = "true"
    thumbnail.src = DEFAULT_PRODUCT_IMAGE
  })
  thumbnailWrapper.append(thumbnail)
  thumbnailCell.append(thumbnailWrapper)

  const nameCell = document.createElement("td")
  nameCell.className = "products-table__name"
  nameCell.textContent = product.nombre

  const descriptionCell = document.createElement("td")
  descriptionCell.className = "products-table__description"
  descriptionCell.textContent = product.descripcion

  const priceCell = document.createElement("td")
  priceCell.className = "products-table__price"
  priceCell.textContent = formatPrice(product.precio)

  const categoryCell = document.createElement("td")
  categoryCell.textContent = getCategoryNameById(product.categoriaId, product.categoriaNombre)

  const stockCell = document.createElement("td")
  stockCell.className = "products-table__stock"
  stockCell.textContent = String(product.stock)

  const statusCell = document.createElement("td")
  const statusBadge = document.createElement("span")
  statusBadge.className = `status-badge ${product.disponible ? "status-badge--available" : "status-badge--unavailable"}`
  statusBadge.textContent = product.disponible ? "Disponible" : "No disponible"
  statusCell.append(statusBadge)

  const actionsCell = document.createElement("td")
  const actionsContainer = document.createElement("div")
  actionsContainer.className = "products-actions"

  const editButton = document.createElement("button")
  editButton.type = "button"
  editButton.className = "products-actions__button"
  editButton.textContent = "Editar"
  editButton.addEventListener("click", () => {
    openModal("edit", product)
  })

  const deleteButton = document.createElement("button")
  deleteButton.type = "button"
  deleteButton.className = "products-actions__button products-actions__button--danger"
  deleteButton.textContent = "Eliminar"
  deleteButton.addEventListener("click", () => {
    void handleDeleteProduct(product)
  })

  actionsContainer.append(editButton, deleteButton)
  actionsCell.append(actionsContainer)

  row.append(
    idHeader,
    thumbnailCell,
    nameCell,
    descriptionCell,
    priceCell,
    categoryCell,
    stockCell,
    statusCell,
    actionsCell,
  )

  return row
}

const renderProducts = (items: IProductDTO[]) => {
  productsTableBody.innerHTML = ""

  if (items.length === 0) {
    const emptyRow = document.createElement("tr")
    const emptyCell = document.createElement("td")
    emptyCell.colSpan = 9
    emptyCell.className = "products-empty"
    emptyCell.textContent = "Aún no hay productos registrados. Crea uno nuevo para comenzar."
    emptyRow.append(emptyCell)
    productsTableBody.append(emptyRow)
    return
  }

  const fragment = document.createDocumentFragment()
  for (const product of items) {
    fragment.append(createProductRow(product))
  }
  productsTableBody.append(fragment)
}

const parseResponseMessage = (payload: string): string => {
  const trimmed = payload.trim()
  if (!trimmed) {
    return ""
  }

  try {
    const parsed = JSON.parse(trimmed) as { mensaje?: unknown }
    if (parsed && typeof parsed === "object" && typeof parsed.mensaje === "string") {
      return parsed.mensaje
    }
  } catch (error) {
    console.warn("No se pudo interpretar la respuesta del servidor como JSON", error)
  }

  return trimmed
}

const updateProductAvailability = async (productId: number, shouldBeAvailable: boolean): Promise<AvailabilityChangeResult> => {
  if (!PRODUCTS_API_URL) {
    return { success: false, message: "No se configuró la URL de productos." }
  }

  const endpoint = shouldBeAvailable ? `${PRODUCTS_API_URL}/${productId}/reactivar` : `${PRODUCTS_API_URL}/${productId}`
  const method = shouldBeAvailable ? "PATCH" : "DELETE"

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    })

    const payload = await response.text()
    const message = parseResponseMessage(payload)

    if (!response.ok) {
      return {
        success: false,
        message: message || "No se pudo actualizar la disponibilidad del producto.",
      }
    }

    return {
      success: true,
      message: message || (shouldBeAvailable ? "Producto activado correctamente." : "Producto desactivado correctamente."),
    }
  } catch (error) {
    console.error("Error al actualizar la disponibilidad del producto", error)
    return {
      success: false,
      message: "Ocurrió un error de conexión al actualizar la disponibilidad.",
    }
  }
}

const handleDeleteProduct = async (product: IProductDTO) => {
  const confirmation = window.confirm(
    `¿Deseas eliminar el producto "${product.nombre}"? Esta acción no se puede deshacer.`,
  )

  if (!confirmation) {
    return
  }

  const { success, message } = await updateProductAvailability(product.id, false)

  if (success) {
    showNotification(message ?? "Producto eliminado correctamente.", "success")
    await fetchProducts()
  } else if (message) {
    showNotification(message, "error")
  }
}

const fetchCategories = async () => {
  if (!CATEGORIES_API_URL) {
    showNotification("No se configuró la URL de categorías.", "error")
    categories = []
    populateCategorySelect()
    return
  }

  try {
    const { data, error } = await Get<unknown>(CATEGORIES_API_URL)

    if (error) {
      throw new Error(error?.mensaje ?? "No se pudieron obtener las categorías.")
    }

    categories = adaptCategories(data)
    populateCategorySelect()

    if (categories.length === 0) {
      showNotification("Necesitas crear una categoría antes de registrar productos.", "info")
    }
  } catch (error) {
    console.error("Error al cargar las categorías", error)
    showNotification(
      error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar las categorías.",
      "error",
    )
    categories = []
    populateCategorySelect()
  }
}

const fetchProducts = async () => {
  if (!PRODUCTS_API_URL) {
    showErrorState("No se configuró la URL para obtener los productos.")
    renderProducts([])
    return
  }

  showLoading()
  hideErrorState()

  try {
    const allResponse = await Get<unknown>(PRODUCTS_API_URL)

    if (allResponse.error) {
      throw new Error(allResponse.error?.mensaje ?? "No se pudieron obtener los productos.")
    }

    const adaptedAll = adaptProducts(allResponse.data)

    let eliminatedIds = new Set<number>()
    try {
      const eliminatedResponse = await Get<unknown>(`${PRODUCTS_API_URL}/eliminados`)
      if (!eliminatedResponse.error && eliminatedResponse.data !== undefined) {
        const eliminatedProducts = adaptProducts(eliminatedResponse.data)
        eliminatedIds = new Set(eliminatedProducts.map((item) => item.id))
      }
    } catch (error) {
      console.warn("No se pudieron obtener los productos eliminados", error)
    }

    products = adaptedAll.map((product) => ({
      ...product,
      disponible: eliminatedIds.has(product.id) ? false : product.disponible,
    }))

    renderProducts(products)

    if (products.length === 0) {
      showNotification("No se encontraron productos registrados. Crea uno nuevo para comenzar.", "info")
    }
  } catch (error) {
    console.error("Error al cargar los productos", error)
    const message =
      error instanceof Error ? error.message : "Ocurrió un error inesperado al intentar cargar los productos."
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

  if (!productForm.reportValidity()) {
    return
  }

  const nombre = productNameInput.value.trim()
  const descripcion = productDescriptionInput.value.trim()
  const precioRaw = productPriceInput.value.trim()
  const stockRaw = productStockInput.value.trim()
  const categoriaRaw = productCategorySelect.value
  const urlImagen = productImageInput.value.trim()
  const disponible = productAvailableInput.checked

  if (!nombre || !descripcion || !precioRaw || !stockRaw || !categoriaRaw || !urlImagen) {
    showFormError("Completa todos los campos requeridos.")
    return
  }

  const precio = Number.parseFloat(precioRaw)
  if (!Number.isFinite(precio) || precio <= 0) {
    productPriceInput.setCustomValidity("Ingresa un precio válido mayor a 0.")
    productPriceInput.reportValidity()
    productPriceInput.setCustomValidity("")
    return
  }

  const stock = Number.parseInt(stockRaw, 10)
  if (!Number.isFinite(stock) || stock < 0) {
    productStockInput.setCustomValidity("Ingresa un stock válido mayor o igual a 0.")
    productStockInput.reportValidity()
    productStockInput.setCustomValidity("")
    return
  }

  const categoriaId = Number.parseInt(categoriaRaw, 10)
  if (!Number.isFinite(categoriaId) || !categories.some((category) => category.id === categoriaId)) {
    productCategorySelect.setCustomValidity("Selecciona una categoría válida.")
    productCategorySelect.reportValidity()
    productCategorySelect.setCustomValidity("")
    return
  }

  if (!validateImageUrl(urlImagen)) {
    productImageInput.setCustomValidity("Ingresa una URL válida para la imagen.")
    productImageInput.reportValidity()
    productImageInput.setCustomValidity("")
    return
  }

  if (!PRODUCTS_API_URL) {
    showFormError("No se configuró la URL de productos.")
    return
  }

  const payload: IProductInputDTO = {
    nombre,
    descripcion,
    precio,
    stock,
    urlImagen,
    categoriaId,
  }

  setFormLoading(true)

  try {
    if (modalMode === "edit" && editingProductId !== null) {
      const { data, error } = await updateById<IProductInputDTO, unknown>(payload, editingProductId, PRODUCTS_API_URL)

      if (error || !data) {
        throw new Error(error?.mensaje ?? "No se pudo actualizar el producto.")
      }

      const updatedProduct = adaptProduct(data)

      if (!updatedProduct) {
        throw new Error("La respuesta del servidor no contiene la información del producto actualizado.")
      }

      if (disponible !== editingInitialAvailability) {
        const availabilityResult = await updateProductAvailability(editingProductId, disponible)
        if (!availabilityResult.success) {
          throw new Error(availabilityResult.message ?? "No se pudo actualizar la disponibilidad del producto.")
        }
      }

      showNotification("Producto actualizado correctamente.", "success")
    } else {
      const { data, error } = await Post<IProductInputDTO, unknown>(payload, PRODUCTS_API_URL)

      if (error || !data) {
        throw new Error(error?.mensaje ?? "No se pudo crear el producto.")
      }

      const createdProduct = adaptProduct(data)

      if (!createdProduct) {
        throw new Error("La respuesta del servidor no contiene la información del producto creado.")
      }

      if (!disponible) {
        const availabilityResult = await updateProductAvailability(createdProduct.id, false)
        if (!availabilityResult.success) {
          throw new Error(availabilityResult.message ?? "No se pudo actualizar la disponibilidad del producto.")
        }
      }

      showNotification("Producto creado correctamente.", "success")
    }

    closeModal()
    await fetchProducts()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ocurrió un error al guardar el producto."
    showFormError(message)
  } finally {
    setFormLoading(false)
  }
}

const initProductsPage = () => {
  checkAuthUsers("ADMINISTRADOR", "/src/pages/auth/login/login.html")

  newProductButton.addEventListener("click", () => {
    resetForm()
    openModal("create")
  })

  productCancelButton.addEventListener("click", () => {
    closeModal()
  })

  productModalClose.addEventListener("click", () => {
    closeModal()
  })

  productModal.addEventListener("cancel", (event) => {
    event.preventDefault()
    closeModal()
  })

  productForm.addEventListener("submit", (event) => {
    void handleFormSubmit(event)
  })

  if (retryButton) {
    retryButton.addEventListener("click", () => {
      void fetchProducts()
    })
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logoutUser()
      checkAuthUsers("ADMINISTRADOR", "/src/pages/auth/login/login.html")
    })
  }

  populateCategorySelect()
  void fetchCategories()
  void fetchProducts()
}

initProductsPage()