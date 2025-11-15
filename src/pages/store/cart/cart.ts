import { Get, Post } from "../../../services/api.ts"
import { readEnvOr } from "@utils/env"

import { requireElementById } from "@utils/dom"
import { formatCurrency } from "@utils/format"
import { normalizeBoolean, normalizeNumber, normalizeString, unwrapCollection } from "@utils/normalize"
import { logoutUser } from "@utils/localStorage"
import type { IUsuarioLogin } from "@models/IUsuarios/IUsuarioLogin"

interface CartItem {
  id: string
  quantity: number
}

interface ProductItem {
  id: string
  name: string
  price: number
  stock: number
  image: string
  available: boolean
}

interface CartItemDetail {
  id: string
  quantity: number
  product: ProductItem | null
  maxQuantity: number
  isAvailable: boolean
}

interface CheckoutOrderItemPayload {
  productoId: number
  cantidad: number
}

interface CheckoutOrderPayload {
  usuarioId: number
  items: CheckoutOrderItemPayload[]
}




const PRODUCTS_API_URL = readEnvOr("VITE_API_URL_PRODUCTS", "")
const CART_STORAGE_KEY = "storeCartItems"
const SHIPPING_COST = 500
const ORDERS_API_URL = readEnvOr("VITE_API_URL_CLIENT_ORDERS", "")
const CREATE_ORDER_API_URL = readEnvOr("VITE_API_URL_CLIENT_CART", "")

const fallbackImage = new URL("../home/assets/pngwing.png", import.meta.url).href

const cartList = requireElementById<HTMLDivElement>("cart-list")
const cartLoadingState = requireElementById<HTMLElement>("cart-loading-state")
const cartErrorState = requireElementById<HTMLElement>("cart-error-state")
const cartErrorMessage = requireElementById<HTMLParagraphElement>("cart-error-message")
const cartRetryButton = requireElementById<HTMLButtonElement>("cart-retry-button")
const cartEmptyState = requireElementById<HTMLElement>("cart-empty-state")
const cartConfirmation = requireElementById<HTMLDivElement>("cart-confirmation")
const summarySection = requireElementById<HTMLElement>("summary-section")
const summarySubtotal = requireElementById<HTMLSpanElement>("summary-subtotal")
const summaryShipping = requireElementById<HTMLSpanElement>("summary-shipping")
const summaryTotal = requireElementById<HTMLSpanElement>("summary-total")
const summaryWarning = requireElementById<HTMLParagraphElement>("summary-warning")
const itemCountLabel = requireElementById<HTMLParagraphElement>("cart-item-count")
const checkoutButton = requireElementById<HTMLButtonElement>("checkout-button")
const clearCartButton = requireElementById<HTMLButtonElement>("clear-cart-button")
const checkoutModal = requireElementById<HTMLDivElement>("checkout-modal")
const checkoutForm = requireElementById<HTMLFormElement>("checkout-form")
const checkoutFeedback = requireElementById<HTMLParagraphElement>("checkout-feedback")
const checkoutPhone = requireElementById<HTMLInputElement>("checkout-phone")
const checkoutCloseTriggers = checkoutModal.querySelectorAll<HTMLElement>("[data-close]")
const checkoutSubmitButton = checkoutForm.querySelector<HTMLButtonElement>('button[type="submit"]')
const cartBadge = requireElementById<HTMLSpanElement>("cart-badge")

const logoutButton = document.getElementById("logout-button") as HTMLAnchorElement | null

let cartItems: CartItem[] = []
let products: ProductItem[] = []
let isLoadingProducts = false
let loadErrorMessage: string | null = null
let confirmationMessage: string | null = null
const quantityWarnings = new Map<string, string>()
let lastFocusedElement: HTMLElement | null = null

const getCurrentUser = (): IUsuarioLogin | null => {
  const raw = localStorage.getItem("userData")
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<IUsuarioLogin>
    if (parsed && typeof parsed.id === "number" && parsed.loggedIn) {
      return parsed as IUsuarioLogin
    }
  } catch (error) {
    console.error("No se pudo parsear la sesión del usuario", error)
  }

  return null
}

const formatProductsCount = (count: number): string => {
  if (count === 1) {
    return "1 producto"
  }
  return `${count} productos`
}

const parseCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed: CartItem[] = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((item) => Boolean(item) && typeof item.id === "string")
      .map((item) => ({
        id: item.id,
        quantity:
          typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
            ? Math.trunc(item.quantity)
            : 1,
      }))
      .filter((item) => item.quantity > 0)
  } catch (error) {
    console.error("No se pudo leer el carrito", error)
    return []
  }
}

const saveCart = (items: CartItem[]) => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}

const updateCartBadge = () => {
  const total = cartItems.reduce((acc, item) => acc + (item.quantity ?? 0), 0)
  cartBadge.textContent = String(total)
}

const adaptProduct = (value: unknown): ProductItem | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>

  const id = normalizeString(record.id ?? record.productId ?? record.codigo ?? record.uuid)
  if (!id) {
    return null
  }

  const name = normalizeString(record.name ?? record.nombre ?? record.titulo) ?? "Producto sin nombre"
  const price = normalizeNumber(record.price ?? record.precio ?? record.valor ?? record.costo) ?? 0
  const stock = Math.max(0, Math.trunc(normalizeNumber(record.stock ?? record.existencias ?? record.cantidad) ?? 0))
  const image =
    normalizeString(
      record.image ?? record.imagen ?? record.imageUrl ?? record.urlImagen ?? record.url ?? record.foto ?? record.imagenUrl,
    ) ?? fallbackImage
  const availableFlag = normalizeBoolean(record.available ?? record.activo ?? record.habilitado ?? record.enabled)
  const eliminated = normalizeBoolean(record.eliminado ?? record.inactivo ?? record.deleted ?? record.isDeleted)
  const available = availableFlag ?? (eliminated === undefined ? true : !eliminated)

  return {
    id,
    name,
    price,
    stock,
    image,
    available,
  }
}

const adaptProducts = (value: unknown): ProductItem[] => {
  const collection = unwrapCollection(value, { unwrapNestedObject: true })
  return collection
    .map((item) => adaptProduct(item))
    .filter((item): item is ProductItem => Boolean(item))
}

const findProduct = (productId: string): ProductItem | null => {
  return products.find((product) => product.id === productId) ?? null
}

const buildCartDetails = (): CartItemDetail[] => {
  let hasChanges = false

  const details: CartItemDetail[] = cartItems.map((item) => {
    const product = findProduct(item.id)
    let quantity = Math.trunc(item.quantity)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      quantity = 1
      hasChanges = true
    }

    if (product) {
      const stock = Math.max(0, Math.trunc(product.stock))
      if (stock > 0 && quantity > stock) {
        quantity = stock
        hasChanges = true
        quantityWarnings.set(item.id, `Solo hay ${stock} unidades disponibles.`)
      }
    }

    const isAvailable = Boolean(product && product.available && product.stock > 0)
    const maxQuantity = product ? Math.max(0, Math.trunc(product.stock)) : 0

    return {
      id: item.id,
      quantity,
      product,
      maxQuantity,
      isAvailable,
    }
  })

  if (hasChanges) {
    cartItems = details
      .filter((detail) => detail.quantity > 0)
      .map((detail) => ({ id: detail.id, quantity: detail.quantity }))
    saveCart(cartItems)
    updateCartBadge()
  }

  return details
}

const formatMoney = (value: number): string => formatCurrency(Number.isFinite(value) ? value : 0)

const createCartItemElement = (detail: CartItemDetail): HTMLElement => {
  const { id, product, quantity, maxQuantity, isAvailable } = detail

  const item = document.createElement("article")
  item.className = "cart-item"
  item.dataset.productId = id

  const imageWrapper = document.createElement("div")
  imageWrapper.className = "cart-item__image"
  const image = document.createElement("img")
  image.src = product?.image ?? fallbackImage
  image.alt = product?.name ?? "Producto no disponible"
  imageWrapper.appendChild(image)

  const body = document.createElement("div")
  body.className = "cart-item__body"

  const info = document.createElement("div")
  info.className = "cart-item__info"

  const title = document.createElement("h3")
  title.className = "cart-item__title"
  title.textContent = product?.name ?? "Producto no disponible"

  const meta = document.createElement("div")
  meta.className = "cart-item__meta"

  const unitPrice = document.createElement("p")
  unitPrice.className = "cart-item__price"
  unitPrice.textContent = product ? formatMoney(product.price) : "Precio no disponible"

  const stockInfo = document.createElement("p")
  if (product) {
    if (!product.available) {
      stockInfo.textContent = "Producto no disponible"
    } else if (product.stock <= 0) {
      stockInfo.textContent = "Sin stock"
    } else {
      stockInfo.textContent = `Stock disponible: ${product.stock}`
    }
  } else {
    stockInfo.textContent = "No pudimos cargar este producto"
  }

  meta.append(stockInfo)
  info.append(title, unitPrice, meta)

  const quantityControls = document.createElement("div")
  quantityControls.className = "cart-item__quantity"

  const decreaseButton = document.createElement("button")
  decreaseButton.type = "button"
  decreaseButton.setAttribute("aria-label", "Disminuir cantidad")
  decreaseButton.innerHTML = "<i class=\"ri-subtract-line\"></i>"

  const quantityValue = document.createElement("span")
  quantityValue.textContent = String(quantity)

  const increaseButton = document.createElement("button")
  increaseButton.type = "button"
  increaseButton.setAttribute("aria-label", "Incrementar cantidad")
  increaseButton.innerHTML = "<i class=\"ri-add-line\"></i>"

  const removeButton = document.createElement("button")
  removeButton.type = "button"
  removeButton.className = "cart-item__remove"
  removeButton.innerHTML = '<i class="ri-delete-bin-6-line" aria-hidden="true"></i> Eliminar'

  const totalWrapper = document.createElement("div")
  totalWrapper.className = "cart-item__total"

  const totalLabel = document.createElement("strong")
  const totalAmount = product && isAvailable ? quantity * product.price : 0
  totalLabel.textContent = formatMoney(totalAmount)

  const totalNote = document.createElement("span")
  totalNote.textContent = "Total"
  totalNote.className = "cart-item__total-label"

  const actions = document.createElement("div")
  actions.className = "cart-item__actions"
  actions.appendChild(removeButton)

  let warningMessage = quantityWarnings.get(id)
  if (warningMessage && maxQuantity > 0 && quantity < maxQuantity) {
    quantityWarnings.delete(id)
    warningMessage = undefined
  }

  const warning = document.createElement("p")
  warning.className = "cart-item__warning"
  if (warningMessage) {
    warning.textContent = warningMessage
  } else if (!product || !isAvailable) {
    warning.textContent = product?.available === false
      ? "Este producto ya no está disponible."
      : product && product.stock <= 0
      ? "No hay stock disponible actualmente."
      : "Este producto no se encuentra disponible."
  } else if (maxQuantity > 0 && quantity >= maxQuantity) {
    warning.textContent = "Alcanzaste el stock disponible."
  }
  warning.hidden = !warning.textContent

  const canModifyQuantity = Boolean(product && product.available && product.stock > 0)
  decreaseButton.disabled = !canModifyQuantity || quantity <= 1
  increaseButton.disabled = !canModifyQuantity || (maxQuantity > 0 && quantity >= maxQuantity)

  decreaseButton.addEventListener("click", () => {
    if (quantity <= 1) {
      return
    }
    updateItemQuantity(id, quantity - 1)
  })

  increaseButton.addEventListener("click", () => {
    if (!product) {
      return
    }
    if (maxQuantity > 0 && quantity >= maxQuantity) {
      quantityWarnings.set(id, `Solo hay ${maxQuantity} unidades disponibles.`)
      renderCart()
      return
    }
    updateItemQuantity(id, quantity + 1)
  })

  removeButton.addEventListener("click", () => {
    removeItem(id)
  })

  quantityControls.append(decreaseButton, quantityValue, increaseButton)
  totalWrapper.append(totalNote, totalLabel, actions, warning)
  body.append(info, quantityControls, totalWrapper)
  item.append(imageWrapper, body)

  return item
}

const renderCartItems = (details: CartItemDetail[]) => {
  cartList.innerHTML = ""
  if (!details.length) {
    return
  }

  const fragment = document.createDocumentFragment()
  details.forEach((detail) => {
    const element = createCartItemElement(detail)
    fragment.appendChild(element)
  })
  cartList.appendChild(fragment)
}

const renderSummary = (details: CartItemDetail[]) => {
  const subtotal = details.reduce((acc, detail) => {
    if (!detail.product || !detail.isAvailable) {
      return acc
    }
    return acc + detail.quantity * detail.product.price
  }, 0)

  const hasItems = details.length > 0
  const hasPurchasableItems = details.some((detail) => detail.isAvailable)
  const shipping = hasPurchasableItems ? SHIPPING_COST : 0
  const total = subtotal + shipping

  summarySubtotal.textContent = formatMoney(subtotal)
  summaryShipping.textContent = formatMoney(shipping)
  summaryTotal.textContent = formatMoney(total)

  const hasUnavailableItems = details.some((detail) => !detail.isAvailable)
  const warningMessage = hasUnavailableItems
    ? "Hay productos sin stock o no disponibles. Ajustá tu pedido para continuar."
    : hasPurchasableItems
    ? ""
    : hasItems
    ? "No hay productos disponibles para procesar el pedido."
    : ""

  if (warningMessage) {
    summaryWarning.hidden = false
    summaryWarning.textContent = warningMessage
  } else {
    summaryWarning.hidden = true
    summaryWarning.textContent = ""
  }

  const disableCheckout =
    !hasPurchasableItems || isLoadingProducts || Boolean(loadErrorMessage) || Boolean(warningMessage)

  checkoutButton.disabled = disableCheckout
  clearCartButton.disabled = !hasItems || isLoadingProducts
}

const renderCart = () => {
  const details = buildCartDetails()

  if (details.length > 0) {
    confirmationMessage = null
  }

  const isEmpty = !isLoadingProducts && !loadErrorMessage && details.length === 0

  cartLoadingState.hidden = !isLoadingProducts
  cartErrorState.hidden = !loadErrorMessage
  cartEmptyState.hidden = !isEmpty
  cartList.hidden = isLoadingProducts || isEmpty

  if (loadErrorMessage) {
    cartErrorMessage.textContent = loadErrorMessage
  }

  if (!isLoadingProducts) {
    renderCartItems(details)
  } else {
    cartList.innerHTML = ""
  }

  itemCountLabel.textContent = formatProductsCount(
    details.reduce((acc, detail) => acc + detail.quantity, 0),
  )

  summarySection.hidden = isLoadingProducts || !details.length
  renderSummary(details)

  if (confirmationMessage && !details.length && !isLoadingProducts && !loadErrorMessage) {
    cartConfirmation.hidden = false
    cartConfirmation.textContent = confirmationMessage
  } else {
    cartConfirmation.hidden = true
    cartConfirmation.textContent = ""
  }
}

const openCheckoutModal = () => {
  if (checkoutButton.disabled) {
    return
  }

  lastFocusedElement = document.activeElement as HTMLElement | null
  checkoutModal.classList.add("is-open")
  checkoutModal.setAttribute("aria-hidden", "false")
  document.body.classList.add("modal-open")
  checkoutFeedback.textContent = ""
  if (checkoutPhone) {
    checkoutPhone.focus()
  }
}

const closeCheckoutModal = () => {
  checkoutModal.classList.remove("is-open")
  checkoutModal.setAttribute("aria-hidden", "true")
  document.body.classList.remove("modal-open")
  checkoutFeedback.textContent = ""
  if (lastFocusedElement) {
    lastFocusedElement.focus()
    lastFocusedElement = null
  }
}

const updateItemQuantity = (productId: string, newQuantity: number) => {
  if (newQuantity <= 0) {
    removeItem(productId)
    return
  }

  const product = findProduct(productId)
  if (product && product.stock > 0 && newQuantity > product.stock) {
    quantityWarnings.set(productId, `Solo hay ${product.stock} unidades disponibles.`)
    renderCart()
    return
  }

  quantityWarnings.delete(productId)

  const existing = cartItems.find((item) => item.id === productId)
  if (!existing) {
    return
  }

  existing.quantity = newQuantity
  saveCart(cartItems)
  updateCartBadge()
  renderCart()
}

const removeItem = (productId: string) => {
  quantityWarnings.delete(productId)
  cartItems = cartItems.filter((item) => item.id !== productId)
  saveCart(cartItems)
  updateCartBadge()
  renderCart()
}

const clearCart = () => {
  quantityWarnings.clear()
  cartItems = []
  saveCart(cartItems)
  updateCartBadge()
  renderCart()
}

const loadProducts = async () => {
  if (cartItems.length === 0) {
    products = []
    loadErrorMessage = null
    isLoadingProducts = false
    renderCart()
    return
  }

  if (!PRODUCTS_API_URL) {
    products = []
    loadErrorMessage = "No se configuró la URL de productos."
    isLoadingProducts = false
    renderCart()
    return
  }

  isLoadingProducts = true
  loadErrorMessage = null
  renderCart()

  const { data, error } = await Get<unknown>(PRODUCTS_API_URL)

  if (error) {
    console.error("No se pudieron cargar los productos", error)
    products = []
    loadErrorMessage = error.mensaje ?? "No pudimos cargar los productos."
  } else {
    products = adaptProducts(data)
    loadErrorMessage = null
    quantityWarnings.clear()
  }

  isLoadingProducts = false
  renderCart()
}

const handleCheckoutSubmit = async (event: SubmitEvent) => {
  event.preventDefault()

  if (!checkoutForm.reportValidity()) {
    checkoutFeedback.textContent = "Completá los campos requeridos."
    return
  }

  const formData = new FormData(checkoutForm)
  const phone = (formData.get("phone") as string | null)?.trim()
  const address = (formData.get("address") as string | null)?.trim()
  const payment = (formData.get("payment") as string | null)?.trim()

  if (!phone || !address || !payment) {
    checkoutFeedback.textContent = "Completá los campos requeridos."
    return
  }

  if (!CREATE_ORDER_API_URL) {
    checkoutFeedback.textContent = "No se configuró la URL de pedidos."
    return
  }

  const user = getCurrentUser()
  if (!user) {
    checkoutFeedback.textContent = "Necesitás iniciar sesión para finalizar tu pedido."
    return
  }

  const details = buildCartDetails()
  const items = details
    .filter((detail) => detail.product && detail.isAvailable && detail.quantity > 0)
    .map((detail) => {
      const rawId = detail.product?.id ?? detail.id
      const numericId = Number.parseInt(String(rawId), 10)
      if (!Number.isFinite(numericId) || numericId <= 0) {
        console.warn("No se pudo interpretar el ID del producto para el pedido", rawId)
        return null
      }
      const item: CheckoutOrderItemPayload = {
        productoId: numericId,
        cantidad: detail.quantity,
      }
      return item
    })
    .filter((item): item is CheckoutOrderItemPayload => Boolean(item))

  if (!items.length) {
    checkoutFeedback.textContent = "No hay productos disponibles para procesar el pedido."
    return
  }

  const payload: CheckoutOrderPayload = {
    usuarioId: user.id,
    items,
  }

  checkoutFeedback.textContent = "Confirmando pedido..."
  if (checkoutSubmitButton) {
    checkoutSubmitButton.disabled = true
  }

  try {
    const { error } = await Post<CheckoutOrderPayload, unknown>(payload, CREATE_ORDER_API_URL)
    if (error) {
      throw error
    }

    checkoutFeedback.textContent = "¡Pedido confirmado!"
    confirmationMessage = "¡Gracias por tu compra! Nos pondremos en contacto para coordinar la entrega."
    clearCart()
    closeCheckoutModal()
    checkoutForm.reset()
  } catch (error) {
    console.error("No se pudo confirmar el pedido", error)
    const message =
      typeof error === "object" && error !== null && "mensaje" in error
        ? String((error as { mensaje?: unknown }).mensaje || "No se pudo confirmar el pedido.")
        : "No se pudo confirmar el pedido. Intentá nuevamente."
    checkoutFeedback.textContent = message
  } finally {
    if (checkoutSubmitButton) {
      checkoutSubmitButton.disabled = false
    }
  }
}

const initAuth = () => {
  if (!logoutButton) {
    return
  }

  logoutButton.addEventListener("click", (event) => {
    event.preventDefault()
    logoutUser()
    window.location.href = "../../auth/login/login.html"
  })
}

const initModal = () => {
  checkoutCloseTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      closeCheckoutModal()
    })
  })

  checkoutModal.addEventListener("click", (event) => {
    if (event.target === checkoutModal) {
      closeCheckoutModal()
    }
  })

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && checkoutModal.classList.contains("is-open")) {
      closeCheckoutModal()
    }
  })
}

const init = async () => {
  cartItems = parseCart()
  if (cartItems.length > 0) {
    isLoadingProducts = true
  }
  updateCartBadge()
  renderCart()
  initAuth()
  initModal()

  checkoutButton.addEventListener("click", openCheckoutModal)
  clearCartButton.addEventListener("click", () => {
    confirmationMessage = null
    clearCart()
  })
  cartRetryButton.addEventListener("click", () => {
    loadProducts()
  })
  checkoutForm.addEventListener("submit", (event) => {
    void handleCheckoutSubmit(event)
  })

  await loadProducts()
}

void init()