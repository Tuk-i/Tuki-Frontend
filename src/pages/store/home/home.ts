import { Get } from "../../../services/api.ts"
import { readEnvOr } from "@utils/env"
import { requireElementById } from "@utils/dom"
import { formatCurrency } from "@utils/format"
import { normalizeBoolean, normalizeNumber, normalizeString, unwrapCollection } from "@utils/normalize"
import { logoutUser } from "@utils/localStorage"

interface ProductItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  available: boolean
}

interface CartItem {
  id: string
  quantity: number
}

const fallbackImage = new URL("./assets/pngwing.png", import.meta.url).href

const PRODUCTS_API_URL = readEnvOr("VITE_API_URL_PRODUCTS", "")
const CATEGORIES_API_URL = readEnvOr("VITE_API_URL_CATEGORIES", "")

const cartStorageKey = "storeCartItems"

const searchInput = requireElementById<HTMLInputElement>("search")
const productGrid = requireElementById<HTMLDivElement>("product-grid")
const resultsCount = requireElementById<HTMLParagraphElement>("results-count")
const sortSelect = requireElementById<HTMLSelectElement>("sort")
const categoryList = requireElementById<HTMLUListElement>("category-list")
const sidebar = requireElementById<HTMLElement>("sidebar")
const sidebarToggle = requireElementById<HTMLButtonElement>("sidebar-toggle")
const sidebarClose = requireElementById<HTMLButtonElement>("sidebar-close")
const cartBadge = requireElementById<HTMLSpanElement>("cart-badge")
const logoutButton = document.getElementById("logout-button") as HTMLAnchorElement | null

const state = {
  search: "",
  category: "all",
  sort: "name-asc",
}

let products: ProductItem[] = []
let remoteCategories: string[] = []
let isLoadingProducts = true
let loadErrorMessage: string | null = null

const normalizeCategory = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

const adaptCategoryValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return normalizeCategory(value)
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return normalizeCategory(
      normalizeString(record.nombre ?? record.name ?? record.titulo ?? record.descripcion ?? record.label)
    )
  }
  return undefined
}

const adaptProduct = (value: unknown): ProductItem | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>

  const id = normalizeString(record.id ?? record.productId ?? record.codigo ?? record.uuid)
  const name = normalizeString(record.name ?? record.nombre ?? record.titulo) ?? "Producto sin nombre"
  const description =
    normalizeString(record.description ?? record.descripcion ?? record.detalle ?? record.resumen) ?? ""
  const price = normalizeNumber(record.price ?? record.precio ?? record.costo ?? record.valor) ?? 0
  const category =
    adaptCategoryValue(record.category ?? record.categoria ?? record.tipo ?? record.rubro) ?? "Sin categoría"
  const image =
    normalizeString(
      record.image ?? record.imagen ?? record.imagenUrl ?? record.imageUrl ?? record.urlImagen ?? record.foto
    ) ?? fallbackImage
  const available = normalizeBoolean(record.available ?? record.disponible ?? record.activo) ?? true

  if (!id) {
    return null
  }

  return {
    id,
    name,
    description,
    price,
    category,
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

const adaptCategories = (value: unknown): string[] => {
  const collection = unwrapCollection(value, { unwrapNestedObject: true })
  const parsed = collection
    .map((item) => adaptCategoryValue(item))
    .filter((item): item is string => Boolean(item))
  return Array.from(new Set(parsed))
}

const ensureActiveCategory = (available: string[]) => {
  if (state.category !== "all" && !available.includes(state.category)) {
    state.category = "all"
  }
}

const getAvailableCategories = (): string[] => {
  if (remoteCategories.length) {
    return remoteCategories
  }
  const derived = Array.from(new Set(products.map((product) => product.category))).filter(Boolean)
  return derived
}

const buildCategories = () => {
  const availableCategories = getAvailableCategories()
  ensureActiveCategory(availableCategories)

  categoryList.innerHTML = ""

  const categoriesToRender = ["all", ...availableCategories]

  categoriesToRender.forEach((category) => {
    const listItem = document.createElement("li")
    const button = document.createElement("button")

    const isAll = category === "all"
    button.textContent = isAll ? "Todas" : category
    button.type = "button"
    button.dataset.category = category
    button.classList.toggle("is-active", state.category === category)
    button.addEventListener("click", () => {
      state.category = category
      renderProducts()
      updateActiveCategory()
      if (window.innerWidth < 992) {
        sidebar.classList.remove("is-open")
      }
    })

    listItem.appendChild(button)
    categoryList.appendChild(listItem)
  })
}

const updateActiveCategory = () => {
  const buttons = categoryList.querySelectorAll<HTMLButtonElement>("button[data-category]")
  buttons.forEach((button) => {
    const buttonCategory = button.dataset.category ?? "all"
    button.classList.toggle("is-active", buttonCategory === state.category)
  })
}

const createProductCard = (product: ProductItem): HTMLElement => {
  const card = document.createElement("article")
  card.className = "product-card"
  card.dataset.productId = product.id

  const imageWrapper = document.createElement("div")
  imageWrapper.className = "product-card__image"

  const image = document.createElement("img")
  image.src = product.image || fallbackImage
  image.alt = product.name

  const availability = document.createElement("span")
  availability.className = `product-card__availability ${product.available ? "is-available" : "is-unavailable"}`
  availability.textContent = product.available ? "Disponible" : "Agotado"

  imageWrapper.append(image, availability)

  const body = document.createElement("div")
  body.className = "product-card__body"

  const title = document.createElement("h3")
  title.className = "product-card__title"
  title.textContent = product.name

  const description = document.createElement("p")
  description.className = "product-card__description"
  description.textContent = product.description

  const footer = document.createElement("div")
  footer.className = "product-card__footer"

  const price = document.createElement("span")
  price.className = "product-card__price"
  price.textContent = formatCurrency(product.price)

  const button = document.createElement("button")
  button.className = "product-card__button"
  button.type = "button"
  button.textContent = product.available ? "Agregar" : "Agotado"
  button.disabled = !product.available

  button.addEventListener("click", (event) => {
    event.stopPropagation()
    if (!product.available) return
    addToCart(product.id)
    button.textContent = "Añadido"
    button.disabled = true
    setTimeout(() => {
      button.textContent = "Agregar"
      button.disabled = false
    }, 1000)
  })

  footer.append(price, button)
  body.append(title, description, footer)

  card.append(imageWrapper, body)

  card.addEventListener("click", () => {
    window.location.href = `../productDetail/productDetail.html?id=${encodeURIComponent(product.id)}`
  })

  return card
}

const renderProducts = () => {
  productGrid.innerHTML = ""

  if (isLoadingProducts) {
    resultsCount.textContent = "Cargando productos..."
    const loadingState = document.createElement("p")
    loadingState.textContent = "Cargando productos..."
    loadingState.className = "catalog__empty"
    productGrid.appendChild(loadingState)
    return
  }

  if (loadErrorMessage) {
    resultsCount.textContent = "0 productos encontrados"
    const errorState = document.createElement("p")
    errorState.textContent = loadErrorMessage
    errorState.className = "catalog__empty"
    productGrid.appendChild(errorState)
    return
  }

  if (!products.length) {
    resultsCount.textContent = "0 productos encontrados"
    const emptyState = document.createElement("p")
    emptyState.textContent = "No hay productos disponibles en este momento."
    emptyState.className = "catalog__empty"
    productGrid.appendChild(emptyState)
    return
  }

  const normalizedSearch = state.search.trim().toLowerCase()

  const filtered = products.filter((product) => {
    const matchesCategory = state.category === "all" || product.category === state.category
    const matchesSearch = normalizedSearch
      ? `${product.name} ${product.description}`.toLowerCase().includes(normalizedSearch)
      : true
    return matchesCategory && matchesSearch
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (state.sort) {
      case "name-desc":
        return b.name.localeCompare(a.name)
      case "price-asc":
        return a.price - b.price
      case "price-desc":
        return b.price - a.price
      case "name-asc":
      default:
        return a.name.localeCompare(b.name)
    }
  })

  const total = sorted.length
  resultsCount.textContent = `${total} producto${total === 1 ? "" : "s"} encontrado${total === 1 ? "" : "s"}`

  if (!sorted.length) {
    const emptyState = document.createElement("p")
    emptyState.textContent = "No encontramos productos que coincidan con tu búsqueda."
    emptyState.className = "catalog__empty"
    productGrid.appendChild(emptyState)
    return
  }

  sorted
    .map((product) => createProductCard(product))
    .forEach((card) => {
      productGrid.appendChild(card)
    })
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
            ? item.quantity
            : 0,
      }))
  } catch (error) {
    console.error("No se pudo leer el carrito", error)
    return []
  }
}

const saveCart = (items: CartItem[]) => {
  localStorage.setItem(cartStorageKey, JSON.stringify(items))
}

const updateCartBadge = () => {
  const cartItems = parseCart()
  const total = cartItems.reduce((acc, item) => acc + (item.quantity ?? 0), 0)
  cartBadge.textContent = String(total)
}

const addToCart = (productId: string) => {
  const cartItems = parseCart()
  const existingItem = cartItems.find((item) => item.id === productId)
  if (existingItem) {
    existingItem.quantity = (existingItem.quantity ?? 0) + 1
  } else {
    cartItems.push({ id: productId, quantity: 1 })
  }
  saveCart(cartItems)
  updateCartBadge()
}

const loadCategories = async () => {
  if (!CATEGORIES_API_URL) {
    remoteCategories = []
    buildCategories()
    updateActiveCategory()
    return
  }

  const { data, error } = await Get<unknown>(CATEGORIES_API_URL)
  if (error) {
    console.error("No se pudieron cargar las categorías", error)
    remoteCategories = []
  } else {
    remoteCategories = adaptCategories(data)
  }
  buildCategories()
  updateActiveCategory()
}

const loadProducts = async () => {
  if (!PRODUCTS_API_URL) {
    isLoadingProducts = false
    loadErrorMessage = "No se configuró la URL del catálogo."
    products = []
    renderProducts()
    return
  }

  isLoadingProducts = true
  loadErrorMessage = null
  renderProducts()

  const { data, error } = await Get<unknown>(PRODUCTS_API_URL)

  if (error) {
    isLoadingProducts = false
    loadErrorMessage = error.mensaje ?? "No pudimos cargar los productos."
    products = []
    renderProducts()
    return
  }

  const adapted = adaptProducts(data)

  let eliminatedIds = new Set<string>()

  try {
    const eliminatedResponse = await Get<unknown>(`${PRODUCTS_API_URL}/eliminados`)
    if (!eliminatedResponse.error && eliminatedResponse.data !== undefined) {
      const eliminatedProducts = adaptProducts(eliminatedResponse.data)
      eliminatedIds = new Set(eliminatedProducts.map((item) => item.id))
    }
  } catch (error) {
    console.warn("No se pudieron obtener los productos eliminados", error)
  }

  products = adapted.filter((product) => !eliminatedIds.has(product.id) && product.available)

  isLoadingProducts = false
  loadErrorMessage = null

  buildCategories()
  updateActiveCategory()
  renderProducts()
}

const initEvents = () => {
  searchInput.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement
    state.search = target.value
    renderProducts()
  })

  sortSelect.addEventListener("change", (event) => {
    const target = event.target as HTMLSelectElement
    state.sort = target.value
    renderProducts()
  })

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.add("is-open")
  })

  sidebarClose.addEventListener("click", () => {
    sidebar.classList.remove("is-open")
  })

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 992) {
      sidebar.classList.remove("is-open")
    }
  })
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

const init = async () => {
  buildCategories()
  updateActiveCategory()
  renderProducts()
  initEvents()
  initAuth()
  updateCartBadge()
  await loadCategories()
  await loadProducts()
}

void init()
