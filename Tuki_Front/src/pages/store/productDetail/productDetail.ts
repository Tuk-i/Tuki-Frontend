import { Get } from "../../../services/api.ts"

interface ProductDetail {
  id: string
  name: string
  description: string
  price: number
  stock: number
  image: string
  category: string
  available: boolean
}

interface CartItem {
  id: string
  quantity: number
}

type FeedbackState = "success" | "error" | "info" | "warning"

type StatusState = "available" | "unavailable" | "warning" | "info"

const PRODUCTS_API_URL = import.meta.env.VITE_API_URL_PRODUCTS as string | undefined
const cartStorageKey = "storeCartItems"

const fallbackImage = new URL("../home/assets/pngwing.png", import.meta.url).href

const requireElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`No se encontró el elemento con id "${id}" en el DOM`)
  }
  return element as T
}

const productContainer = requireElement<HTMLDivElement>("product-container")
const loadingState = requireElement<HTMLElement>("loading-state")
const errorState = requireElement<HTMLElement>("error-state")
const errorMessage = requireElement<HTMLParagraphElement>("error-message")
const retryButton = requireElement<HTMLButtonElement>("retry-button")
const backButton = requireElement<HTMLButtonElement>("back-button")

const productImage = requireElement<HTMLImageElement>("product-image")
const productName = requireElement<HTMLHeadingElement>("product-name")
const productDescription = requireElement<HTMLParagraphElement>("product-description")
const productPrice = requireElement<HTMLParagraphElement>("product-price")
const productStock = requireElement<HTMLSpanElement>("product-stock")
const productCategory = requireElement<HTMLSpanElement>("product-category")
const productStatus = requireElement<HTMLSpanElement>("product-status")

const quantityInput = requireElement<HTMLInputElement>("quantity-input")
const decreaseButton = requireElement<HTMLButtonElement>("quantity-decrease")
const increaseButton = requireElement<HTMLButtonElement>("quantity-increase")
const addToCartButton = requireElement<HTMLButtonElement>("add-to-cart")
const feedbackMessage = requireElement<HTMLParagraphElement>("feedback-message")

let currentProduct: ProductDetail | null = null
let currentProductId: string | null = null
let feedbackTimeout: number | undefined

const readString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  return undefined
}

const readNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const readBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }
  if (typeof value === "number") {
    if (value === 1) return true
    if (value === 0) return false
  }
  return undefined
}

const unwrapCollection = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const candidates = ["data", "items", "results", "content", "productos", "producto", "product", "result"]
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

const adaptProduct = (value: unknown): ProductDetail | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>

  const id = readString(record.id ?? record.productId ?? record.codigo ?? record.uuid)
  if (!id) {
    return null
  }

  const name = readString(record.name ?? record.nombre ?? record.titulo) ?? "Producto sin nombre"
  const description =
    readString(record.description ?? record.descripcion ?? record.detalle ?? record.resumen) ??
    "Sin descripción disponible."
  const price = readNumber(record.price ?? record.precio ?? record.valor ?? record.costo) ?? 0
  const stock = Math.max(0, Math.trunc(readNumber(record.stock ?? record.existencias ?? record.cantidad) ?? 0))
  const image =
    readString(
      record.image ?? record.imagen ?? record.urlImagen ?? record.imageUrl ?? record.url ?? record.foto ?? record.imagenUrl
    ) ?? fallbackImage
  const category = readString(record.category ?? record.categoria ?? record.tipo ?? record.rubro) ?? "Sin categoría"

  const availableFlag = readBoolean(record.available ?? record.activo ?? record.habilitado ?? record.enabled)
  const eliminated = readBoolean(record.eliminado ?? record.inactivo ?? record.deleted ?? record.isDeleted)
  const available = availableFlag ?? (eliminated === undefined ? true : !eliminated)

  return { id, name, description, price, stock, image, category, available }
}

const adaptProductResponse = (value: unknown, expectedId: string): ProductDetail | null => {
  const direct = adaptProduct(value)
  if (direct && direct.id === expectedId) {
    return direct
  }
  if (direct && !expectedId) {
    return direct
  }

  const collection = unwrapCollection(value)
  if (collection.length) {
    for (const item of collection) {
      const adapted = adaptProduct(item)
      if (!adapted) continue
      if (!expectedId || adapted.id === expectedId) {
        return adapted
      }
    }
  }

  return null
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const parseCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(cartStorageKey)
    if (!raw) return []
    const parsed: CartItem[] = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => Boolean(item) && typeof item.id === "string")
      .map((item) => ({
        id: item.id,
        quantity:
          typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
            ? Math.trunc(item.quantity)
            : 0,
      }))
      .filter((item) => item.quantity > 0)
  } catch (error) {
    console.error("No se pudo leer el carrito", error)
    return []
  }
}

const saveCart = (items: CartItem[]) => {
  localStorage.setItem(cartStorageKey, JSON.stringify(items))
}

const addToCart = (productId: string, quantity: number, stockLimit: number): number => {
  const items = parseCart()
  const existing = items.find((item) => item.id === productId)
  if (existing) {
    const previousQuantity = existing.quantity
    const newQuantity = Math.min(previousQuantity + quantity, stockLimit)
    existing.quantity = newQuantity
    saveCart(items)
    return newQuantity - previousQuantity
  }

  const initialQuantity = Math.min(quantity, stockLimit)
  if (initialQuantity <= 0) {
    return 0
  }
  items.push({ id: productId, quantity: initialQuantity })
  saveCart(items)
  return initialQuantity
}

const setLoading = (isLoading: boolean) => {
  loadingState.hidden = !isLoading
  if (isLoading) {
    productContainer.hidden = true
    errorState.hidden = true
  }
}

const showError = (message: string) => {
  errorMessage.textContent = message
  errorState.hidden = false
  productContainer.hidden = true
  loadingState.hidden = true
}

const showFeedback = (message: string, state: FeedbackState) => {
  feedbackMessage.textContent = message
  feedbackMessage.dataset.state = state
  if (feedbackTimeout) {
    window.clearTimeout(feedbackTimeout)
  }
  if (state === "success" || state === "warning") {
    feedbackTimeout = window.setTimeout(() => {
      feedbackMessage.textContent = ""
      feedbackMessage.dataset.state = "info"
    }, 4000)
  }
}

const resetFeedback = () => {
  feedbackMessage.textContent = ""
  feedbackMessage.dataset.state = "info"
  if (feedbackTimeout) {
    window.clearTimeout(feedbackTimeout)
    feedbackTimeout = undefined
  }
}

const updateStatus = (product: ProductDetail) => {
  let text = "Disponible"
  let state: StatusState = "available"

  if (!product.available) {
    text = "No disponible"
    state = "unavailable"
  } else if (product.stock <= 0) {
    text = "Sin stock"
    state = "unavailable"
  } else if (product.stock <= 5) {
    text = `Últimas ${product.stock} unidades`
    state = "warning"
  }

  productStatus.textContent = text
  productStatus.dataset.state = state
}

const updateQuantityControls = (product: ProductDetail | null) => {
  if (!product || !product.available || product.stock <= 0) {
    quantityInput.value = "1"
    quantityInput.disabled = true
    decreaseButton.disabled = true
    increaseButton.disabled = true
    addToCartButton.disabled = true
    return
  }

  quantityInput.disabled = false
  decreaseButton.disabled = false
  increaseButton.disabled = false
  addToCartButton.disabled = false

  const currentValue = Number.parseInt(quantityInput.value, 10)
  const safeValue = Number.isFinite(currentValue) && currentValue > 0 ? currentValue : 1
  const clamped = Math.min(Math.max(safeValue, 1), product.stock)
  quantityInput.value = String(clamped)
  quantityInput.max = String(product.stock)
  decreaseButton.disabled = clamped <= 1
  increaseButton.disabled = clamped >= product.stock
}

const renderProduct = (product: ProductDetail) => {
  currentProduct = product
  productImage.src = product.image
  productImage.alt = `Imagen de ${product.name}`
  productName.textContent = product.name
  productDescription.textContent = product.description
  productPrice.textContent = formatCurrency(product.price)
  productStock.textContent = product.stock > 0 ? `Stock disponible: ${product.stock}` : "Sin unidades disponibles"
  productCategory.textContent = product.category

  updateStatus(product)
  updateQuantityControls(product)

  productContainer.hidden = false
  loadingState.hidden = true
  errorState.hidden = true
}

const clampQuantity = (value: number, product: ProductDetail): number => {
  if (!Number.isFinite(value)) return 1
  const safe = Math.trunc(value)
  return Math.min(Math.max(safe, 1), Math.max(product.stock, 1))
}

const handleQuantityChange = () => {
  if (!currentProduct) return
  const value = Number.parseInt(quantityInput.value, 10)
  const clamped = clampQuantity(value, currentProduct)
  quantityInput.value = String(clamped)
  decreaseButton.disabled = clamped <= 1
  increaseButton.disabled = clamped >= currentProduct.stock
}

const handleIncrease = () => {
  if (!currentProduct) return
  const value = Number.parseInt(quantityInput.value, 10) || 1
  const next = Math.min(value + 1, currentProduct.stock)
  quantityInput.value = String(next)
  decreaseButton.disabled = next <= 1
  increaseButton.disabled = next >= currentProduct.stock
}

const handleDecrease = () => {
  if (!currentProduct) return
  const value = Number.parseInt(quantityInput.value, 10) || 1
  const next = Math.max(value - 1, 1)
  quantityInput.value = String(next)
  decreaseButton.disabled = next <= 1
  increaseButton.disabled = next >= (currentProduct?.stock ?? 1)
}

const handleAddToCart = () => {
  resetFeedback()
  if (!currentProduct) {
    showFeedback("Todavía no cargamos el producto.", "error")
    return
  }

  if (!currentProduct.available) {
    showFeedback("El producto no está disponible actualmente.", "error")
    return
  }

  if (currentProduct.stock <= 0) {
    showFeedback("No hay stock disponible para este producto.", "error")
    return
  }

  const rawValue = Number.parseInt(quantityInput.value, 10)
  const quantity = clampQuantity(Number.isFinite(rawValue) ? rawValue : 1, currentProduct)

  const added = addToCart(currentProduct.id, quantity, currentProduct.stock)
  if (added <= 0) {
    showFeedback("No pudimos agregar el producto al carrito.", "error")
    return
  }

  showFeedback(
    added === quantity
      ? "Producto agregado al carrito."
      : "Alcanzaste el máximo disponible en stock para este producto.",
    added === quantity ? "success" : "warning"
  )
}

const loadProduct = async (productId: string) => {
  if (!PRODUCTS_API_URL) {
    showError("No se configuró la URL del catálogo de productos.")
    return
  }

  currentProductId = productId
  currentProduct = null
  setLoading(true)
  resetFeedback()
  updateQuantityControls(null)

  const sanitizedId = encodeURIComponent(productId)
  const baseUrl = PRODUCTS_API_URL.endsWith("/") ? PRODUCTS_API_URL.slice(0, -1) : PRODUCTS_API_URL
  const detailUrl = `${baseUrl}/${sanitizedId}`

  const { data, error } = await Get<unknown>(detailUrl)

  if (!error) {
    const adapted = adaptProductResponse(data, productId)
    if (adapted) {
      renderProduct(adapted)
      return
    }
  }

  // Intentamos recuperar desde el listado general como fallback
  const listResponse = await Get<unknown>(PRODUCTS_API_URL)
  if (listResponse.error) {
    const message =
      listResponse.error.mensaje ?? error?.mensaje ?? "No pudimos obtener la información del producto."
    showError(message)
    return
  }

  const adaptedFromList = adaptProductResponse(listResponse.data, productId)
  if (!adaptedFromList) {
    showError("El producto que buscás no está disponible.")
    return
  }

  renderProduct(adaptedFromList)
}

const handleRetry = () => {
  if (!currentProductId) {
    showError("No se encontró un identificador de producto para reintentar.")
    return
  }
  void loadProduct(currentProductId)
}

const handleBack = () => {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    window.location.href = "../home/home.html"
  }
}

const init = () => {
  const params = new URLSearchParams(window.location.search)
  const productId = params.get("id")?.trim()

  resetFeedback()
  backButton.addEventListener("click", handleBack)
  retryButton.addEventListener("click", handleRetry)
  quantityInput.addEventListener("input", handleQuantityChange)
  quantityInput.addEventListener("blur", handleQuantityChange)
  increaseButton.addEventListener("click", handleIncrease)
  decreaseButton.addEventListener("click", handleDecrease)
  addToCartButton.addEventListener("click", handleAddToCart)

  if (!productId) {
    setLoading(false)
    showError("No encontramos el producto solicitado. Volvé al catálogo e intentá nuevamente.")
    return
  }

  void loadProduct(productId)
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
