import { Get } from "../../../services/api.ts"
import { checkAuthUsers } from "@utils/auth"
import { readEnvOr } from "@utils/env"
import { requireElementById } from "@utils/dom"
import { formatNumber } from "@utils/format"
import { normalizeBoolean, normalizeNumber, normalizeString, unwrapCollection } from "@utils/normalize"
import { logoutUser } from "@utils/localStorage"

type StatusState = "success" | "warning" | "danger" | "info"

interface CategorySummary {
  id: string
  name: string
  active: boolean
}

interface ProductSummary {
  id: string
  name: string
  available: boolean
  stock: number
}

interface OrderSummary {
  id: string
  status: string
}

interface DashboardMetrics {
  totalCategories: number
  totalProducts: number
  totalOrders: number
  availableProducts: number
  activeCategories: number
  activeProducts: number
  inactiveProducts: number
  ordersByStatus: Map<string, number>
}

const CATEGORIES_API_URL = readEnvOr("VITE_API_URL_CATEGORIES", "")
const PRODUCTS_API_URL = readEnvOr("VITE_API_URL_PRODUCTS", "")
const ORDERS_API_URL = readEnvOr(
  "VITE_API_URL_ADMIN_ORDERS",
  readEnvOr("VITE_API_URL_CLIENT_ORDERS", ""),
)

const totalCategoriesEl = requireElementById<HTMLParagraphElement>("total-categories")
const totalProductsEl = requireElementById<HTMLParagraphElement>("total-products")
const totalOrdersEl = requireElementById<HTMLParagraphElement>("total-orders")
const availableProductsEl = requireElementById<HTMLParagraphElement>("available-products")

const activeCategoriesCountEl = requireElementById<HTMLSpanElement>("active-categories-count")
const activeCategoriesListEl = requireElementById<HTMLUListElement>("active-categories-list")
const productsAvailabilityEl = requireElementById<HTMLSpanElement>("products-availability")
const activeProductsCountEl = requireElementById<HTMLParagraphElement>("active-products-count")
const inactiveProductsCountEl = requireElementById<HTMLParagraphElement>("inactive-products-count")
const ordersStatusListEl = requireElementById<HTMLUListElement>("orders-status-list")
const lastUpdatedEl = requireElementById<HTMLTimeElement>("last-updated")

const requireSummaryCard = (selector: string, name: string): HTMLDivElement => {
  const element = document.querySelector<HTMLDivElement>(selector)
  if (!element) {
    throw new Error(`No se encontró la tarjeta de resumen de ${name}.`)
  }
  return element
}

const categoriesSummaryCard = requireSummaryCard('[data-summary="categories"]', "categorías")
const productsSummaryCard = requireSummaryCard('[data-summary="products"]', "productos")
const ordersSummaryCard = requireSummaryCard('[data-summary="orders"]', "pedidos")

const loadingStateEl = requireElementById<HTMLDivElement>("loading-state")
const errorStateEl = requireElementById<HTMLDivElement>("error-state")
const errorMessageEl = requireElementById<HTMLParagraphElement>("error-message")
const retryButton = requireElementById<HTMLButtonElement>("retry-button")

const logoutButton = document.getElementById("logout-button") as HTMLButtonElement | null

const normalizeStatus = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) {
    return "Sin estado"
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const adaptCategory = (value: unknown): CategorySummary | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const id = normalizeString(record.id ?? record.categoryId ?? record.uuid ?? record.codigo)
  const name =
    normalizeString(
      record.name ??
        record.nombre ??
        record.titulo ??
        record.descripcion ??
        record.label ??
        record.descripcionCategoria ??
        record.detalle
    ) ?? "Categoría sin nombre"

  const statusText = normalizeString(record.status ?? record.estado ?? record.state ?? record.situacion)
  const activeFlag = normalizeBoolean(record.active ?? record.activo ?? record.habilitado ?? record.enabled ?? statusText)
  const active = activeFlag ?? (statusText ? !/inactivo|deshabilitado|baja/i.test(statusText) : true)
  const identifier = id ?? name

  if (!identifier) {
    return null
  }

  return {
    id: identifier,
    name,
    active,
  }
}

const adaptCategoriesResponse = (value: unknown): CategorySummary[] => {
  const collection = unwrapCollection(value, { unwrapNestedObject: true })
  return collection
    .map((item) => adaptCategory(item))
    .filter((item): item is CategorySummary => Boolean(item))
}

const adaptProduct = (value: unknown): ProductSummary | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const id = normalizeString(record.id ?? record.productId ?? record.uuid ?? record.codigo)
  const name =
    normalizeString(record.name ?? record.nombre ?? record.titulo ?? record.descripcion ?? record.descripcionProducto) ??
    "Producto sin nombre"
  const stock = Math.max(
    0,
    Math.trunc(normalizeNumber(record.stock ?? record.existencias ?? record.cantidad ?? record.inventory) ?? 0),
  )
  const statusText = normalizeString(record.status ?? record.estado ?? record.state)
  const availabilityFlag = normalizeBoolean(record.available ?? record.activo ?? record.habilitado ?? record.disponible ?? statusText)
  const available = availabilityFlag ?? (statusText ? !/inactivo|agotado|deshabilitado/i.test(statusText) : stock > 0)

  if (!id) {
    return null
  }

  return {
    id,
    name,
    stock,
    available,
  }
}

const adaptProductsResponse = (value: unknown): ProductSummary[] => {
  const collection = unwrapCollection(value, { unwrapNestedObject: true })
  return collection
    .map((item) => adaptProduct(item))
    .filter((item): item is ProductSummary => Boolean(item))
}

const adaptOrder = (value: unknown): OrderSummary | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const id = normalizeString(record.id ?? record.pedidoId ?? record.orderId ?? record.uuid ?? record.codigo)
  const status =
    normalizeString(
      record.status ??
        record.estado ??
        record.state ??
        record.etapa ??
        record.situacion ??
        record.progreso ??
        record.detalleEstado
    ) ?? "Sin estado"

  return {
    id: id ?? status,
    status: normalizeStatus(status),
  }
}

const adaptOrdersResponse = (value: unknown): OrderSummary[] => {
  const collection = unwrapCollection(value, { unwrapNestedObject: true })
  return collection
    .map((item) => adaptOrder(item))
    .filter((item): item is OrderSummary => Boolean(item))
}

const toErrorMessage = (reason: unknown, fallback: string): string => {
  if (reason instanceof Error && reason.message.trim()) {
    return reason.message
  }
  if (typeof reason === "string" && reason.trim()) {
    return reason.trim()
  }
  if (reason && typeof reason === "object") {
    const record = reason as Record<string, unknown>
    const message = record.mensaje ?? record.message ?? record.error
    if (typeof message === "string" && message.trim()) {
      return message.trim()
    }
  }
  return fallback
}

const clearCardError = (card: HTMLElement) => {
  const existing = card.querySelector<HTMLElement>(".summary-card__error")
  if (existing) {
    existing.remove()
  }
}

const setCardError = (card: HTMLElement, message: string) => {
  clearCardError(card)
  const error = document.createElement("p")
  error.className = "summary-card__error"
  error.textContent = message
  card.appendChild(error)
}

const getStatusTone = (status: string): StatusState => {
  const normalized = status.toLowerCase()
  if (/(entregado|completado|aprobado|pagado)/.test(normalized)) {
    return "success"
  }
  if (/(pendiente|en proceso|preparación|preparando)/.test(normalized)) {
    return "warning"
  }
  if (/(cancelado|rechazado|fallido)/.test(normalized)) {
    return "danger"
  }
  return "info"
}

const renderOrdersStatus = (ordersByStatus: Map<string, number>) => {
  ordersStatusListEl.innerHTML = ""

  if (!ordersByStatus.size) {
    const item = document.createElement("li")
    item.className = "summary-list__item"
    item.textContent = "Sin pedidos registrados."
    ordersStatusListEl.appendChild(item)
    return
  }

  const entries = Array.from(ordersByStatus.entries()).sort((a, b) => b[1] - a[1])

  for (const [status, quantity] of entries) {
    const item = document.createElement("li")
    item.className = "summary-list__item"

    const label = document.createElement("span")
    label.className = "summary-list__label"
    label.textContent = status

    const value = document.createElement("span")
    value.textContent = formatNumber(quantity)

    const tone = getStatusTone(status)
    if (tone === "success") {
      item.style.background = "rgba(22, 163, 74, 0.15)"
    } else if (tone === "danger") {
      item.style.background = "rgba(220, 38, 38, 0.15)"
    } else if (tone === "warning") {
      item.style.background = "rgba(245, 158, 11, 0.18)"
    }

    item.append(label, value)
    ordersStatusListEl.appendChild(item)
  }
}

const renderActiveCategories = (categories: CategorySummary[]) => {
  activeCategoriesListEl.innerHTML = ""

  const activeCategories = categories.filter((category) => category.active)
  activeCategoriesCountEl.textContent = formatNumber(activeCategories.length)

  if (!activeCategories.length) {
    const item = document.createElement("li")
    item.className = "summary-list__item"
    item.textContent = "No hay categorías activas."
    activeCategoriesListEl.appendChild(item)
    return
  }

  const sorted = activeCategories.sort((a, b) => a.name.localeCompare(b.name, "es"))
  const limited = sorted.slice(0, 6)

  for (const category of limited) {
    const item = document.createElement("li")
    item.className = "summary-list__item"
    item.textContent = category.name
    activeCategoriesListEl.appendChild(item)
  }

  if (activeCategories.length > limited.length) {
    const remaining = activeCategories.length - limited.length
    const item = document.createElement("li")
    item.className = "summary-list__item"
    item.textContent = `+${formatNumber(remaining)} categorías adicionales`
    activeCategoriesListEl.appendChild(item)
  }
}

const renderCategoriesErrorMessage = (message: string) => {
  activeCategoriesCountEl.textContent = "--"
  activeCategoriesListEl.innerHTML = ""

  const item = document.createElement("li")
  item.className = "summary-list__item summary-list__item--error"
  item.textContent = message
  activeCategoriesListEl.appendChild(item)
}

const renderProductsErrorMessage = (message: string) => {
  setCardError(productsSummaryCard, message)
}

const renderOrdersErrorMessage = (message: string) => {
  ordersStatusListEl.innerHTML = ""
  const item = document.createElement("li")
  item.className = "summary-list__item summary-list__item--error"
  item.textContent = message
  ordersStatusListEl.appendChild(item)
}

const updateMetrics = (metrics: DashboardMetrics, categories: CategorySummary[]) => {
  totalCategoriesEl.textContent = formatNumber(metrics.totalCategories)
  totalProductsEl.textContent = formatNumber(metrics.totalProducts)
  totalOrdersEl.textContent = formatNumber(metrics.totalOrders)
  availableProductsEl.textContent = formatNumber(metrics.availableProducts)

  productsAvailabilityEl.textContent = `${formatNumber(metrics.availableProducts)} / ${formatNumber(metrics.totalProducts)}`
  activeProductsCountEl.textContent = formatNumber(metrics.activeProducts)
  inactiveProductsCountEl.textContent = formatNumber(metrics.inactiveProducts)

  renderActiveCategories(categories)
  renderOrdersStatus(metrics.ordersByStatus)

  const now = new Date()
  lastUpdatedEl.textContent = `Actualizado ${now.toLocaleString("es-AR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  })}`
  lastUpdatedEl.dateTime = now.toISOString()
}

const calculateMetrics = (
  categories: CategorySummary[],
  products: ProductSummary[],
  orders: OrderSummary[]
): DashboardMetrics => {
  const activeCategories = categories.filter((category) => category.active)
  const availableProducts = products.filter((product) => product.available && product.stock > 0)
  const activeProducts = products.filter((product) => product.available)
  const inactiveProducts = products.length - activeProducts.length

  const ordersByStatus = orders.reduce<Map<string, number>>((accumulator, order) => {
    const current = accumulator.get(order.status) ?? 0
    accumulator.set(order.status, current + 1)
    return accumulator
  }, new Map())

  return {
    totalCategories: categories.length,
    totalProducts: products.length,
    totalOrders: orders.length,
    availableProducts: availableProducts.length,
    activeCategories: activeCategories.length,
    activeProducts: activeProducts.length,
    inactiveProducts,
    ordersByStatus,
  }
}

const showLoading = () => {
  loadingStateEl.hidden = false
  errorStateEl.hidden = true
}

const hideLoading = () => {
  loadingStateEl.hidden = true
}

const showError = (message: string) => {
  errorMessageEl.textContent = message
  errorStateEl.hidden = false
}

const hideError = () => {
  errorStateEl.hidden = true
}

const fetchCollection = async <T>(
  apiUrl: string | undefined,
  adapter: (value: unknown) => T[]
): Promise<T[]> => {
  if (!apiUrl) {
    return []
  }

  const { data, error } = await Get<unknown>(apiUrl)
  if (error) {
    throw new Error(error.mensaje ?? "No se pudo obtener la información.")
  }

  return adapter(data)
}

const loadDashboard = async (): Promise<void> => {
  showLoading()
  hideError()

  try {
    clearCardError(categoriesSummaryCard)
    clearCardError(productsSummaryCard)
    clearCardError(ordersSummaryCard)

    const [categoriesResult, productsResult, ordersResult] = await Promise.allSettled([
      fetchCollection<CategorySummary>(CATEGORIES_API_URL, adaptCategoriesResponse),
      fetchCollection<ProductSummary>(PRODUCTS_API_URL, adaptProductsResponse),
      fetchCollection<OrderSummary>(ORDERS_API_URL, adaptOrdersResponse),
    ])

    const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : []
    const products = productsResult.status === "fulfilled" ? productsResult.value : []
    const orders = ordersResult.status === "fulfilled" ? ordersResult.value : []

    if (categoriesResult.status === "rejected") {
      console.error("No se pudieron cargar las categorías", categoriesResult.reason)
    }
    if (productsResult.status === "rejected") {
      console.error("No se pudieron cargar los productos", productsResult.reason)
    }
    if (ordersResult.status === "rejected") {
      console.error("No se pudieron cargar los pedidos", ordersResult.reason)
    }

    const categoriesErrorMessage =
      categoriesResult.status === "rejected"
        ? toErrorMessage(
            categoriesResult.reason,
            "No se pudieron cargar las categorías. Intentá nuevamente."
          )
        : null

    const productsErrorMessage =
      productsResult.status === "rejected"
        ? toErrorMessage(
            productsResult.reason,
            "No se pudieron cargar los productos. Intentá nuevamente."
          )
        : null

    const ordersErrorMessage =
      ordersResult.status === "rejected"
        ? toErrorMessage(ordersResult.reason, "No se pudieron cargar los pedidos. Intentá nuevamente.")
        : null

    const allRejected =
      categoriesResult.status === "rejected" &&
      productsResult.status === "rejected" &&
      ordersResult.status === "rejected"

    if (allRejected) {
      const message = ordersErrorMessage ?? productsErrorMessage ?? categoriesErrorMessage ?? "No se pudo cargar la información del panel."
      showError(message)
      return
    }

    const metrics = calculateMetrics(categories, products, orders)
    updateMetrics(metrics, categories)

    if (categoriesErrorMessage) {
      totalCategoriesEl.textContent = "--"
      renderCategoriesErrorMessage(categoriesErrorMessage)
    }

    if (productsErrorMessage) {
      totalProductsEl.textContent = "--"
      availableProductsEl.textContent = "--"
      productsAvailabilityEl.textContent = "--"
      activeProductsCountEl.textContent = "--"
      inactiveProductsCountEl.textContent = "--"
      renderProductsErrorMessage(productsErrorMessage)
    }

    if (ordersErrorMessage) {
      totalOrdersEl.textContent = "--"
      renderOrdersErrorMessage(ordersErrorMessage)
    }
  } catch (error) {
    console.error("Error al cargar el dashboard", error)
    const message =
      error instanceof Error && error.message ? error.message : "Ocurrió un error inesperado al cargar el panel."
    showError(message)
  } finally {
    hideLoading()
  }
}

const initDashboard = () => {
  checkAuthUsers("ADMINISTRADOR", "/src/pages/auth/login/login.html")

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logoutUser()
      checkAuthUsers("ADMINISTRADOR", "/src/pages/auth/login/login.html")
    })
  }

  retryButton.addEventListener("click", () => {
    void loadDashboard()
  })

  void loadDashboard()
}

initDashboard()