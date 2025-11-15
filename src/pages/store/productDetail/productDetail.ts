import { Get } from "../../../services/api.ts"
import { readEnvOr } from "@utils/env"
import { requireElementById } from "@utils/dom"
import { formatCurrency } from "@utils/format"
import { normalizeBoolean, normalizeNumber, normalizeString, unwrapCollection } from "@utils/normalize"

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

const PRODUCTS_API_URL = readEnvOr("VITE_API_URL_PRODUCTS", "")
const cartStorageKey = "storeCartItems"

const fallbackImage = new URL("../home/assets/pngwing.png", import.meta.url).href

const productContainer = requireElementById<HTMLDivElement>("product-container")
const loadingState = requireElementById<HTMLElement>("loading-state")
const errorState = requireElementById<HTMLElement>("error-state")
const errorMessage = requireElementById<HTMLParagraphElement>("error-message")
const retryButton = requireElementById<HTMLButtonElement>("retry-button")
const backButton = requireElementById<HTMLButtonElement>("back-button")

const productImage = requireElementById<HTMLImageElement>("product-image")
const productName = requireElementById<HTMLHeadingElement>("product-name")
const productDescription = requireElementById<HTMLParagraphElement>("product-description")
const productPrice = requireElementById<HTMLParagraphElement>("product-price")
const productStock = requireElementById<HTMLSpanElement>("product-stock")
const productCategory = requireElementById<HTMLSpanElement>("product-category")
const productStatus = requireElementById<HTMLSpanElement>("product-status")

const quantityInput = requireElementById<HTMLInputElement>("quantity-input")
const decreaseButton = requireElementById<HTMLButtonElement>("quantity-decrease")
const increaseButton = requireElementById<HTMLButtonElement>("quantity-increase")
const addToCartButton = requireElementById<HTMLButtonElement>("add-to-cart")
const feedbackMessage = requireElementById<HTMLParagraphElement>("feedback-message")

let currentProduct: ProductDetail | null = null
let currentProductId: string | null = null
let feedbackTimeout: number | undefined

const adaptProduct = (value: unknown): ProductDetail | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>

  const id = normalizeString(record.id ?? record.productId ?? record.codigo ?? record.uuid)
  if (!id) {
    return null
  }

  const name = normalizeString(record.name ?? record.nombre ?? record.titulo) ?? "Producto sin nombre"
  const description =
    normalizeString(record.description ?? record.descripcion ?? record.detalle ?? record.resumen) ??
    "Sin descripción disponible."
  const price = normalizeNumber(record.price ?? record.precio ?? record.valor ?? record.costo) ?? 0
  const stock = Math.max(0, Math.trunc(normalizeNumber(record.stock ?? record.existencias ?? record.cantidad) ?? 0))
  const image =
    normalizeString(
      record.image ?? record.imagen ?? record.urlImagen ?? record.imageUrl ?? record.url ?? record.foto ?? record.imagenUrl
    ) ?? fallbackImage
  const category = normalizeString(record.category ?? record.categoria ?? record.tipo ?? record.rubro) ?? "Sin categoría"

  const availableFlag = normalizeBoolean(record.available ?? record.activo ?? record.habilitado ?? record.enabled)
  const eliminated = normalizeBoolean(record.eliminado ?? record.inactivo ?? record.deleted ?? record.isDeleted)
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

  const collection = unwrapCollection(value, { unwrapNestedObject: true })
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
