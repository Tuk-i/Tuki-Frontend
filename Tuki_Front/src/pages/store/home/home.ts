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

const products: ProductItem[] = [
  {
    id: "classic-burger",
    name: "Hamburguesa Clásica",
    description:
      "Pan artesanal, medallón de carne, queso cheddar, lechuga fresca y nuestra salsa especial.",
    price: 12.5,
    category: "Hamburguesas",
    image: new URL("./assets/—Pngtree—hamburger_15881307.png", import.meta.url).href,
    available: true,
  },
  {
    id: "pancho-premium",
    name: "Pancho Premium",
    description:
      "Salchicha de res ahumada, pan brioche tostado y topping de cebolla caramelizada.",
    price: 6.75,
    category: "Street Food",
    image: new URL("./assets/pancho.png", import.meta.url).href,
    available: true,
  },
  {
    id: "papas-crispy",
    name: "Papas Crinkle",
    description:
      "Corte crinkle frito en aceite vegetal, con hierbas provenzales y alioli casero.",
    price: 4.5,
    category: "Acompañamientos",
    image: new URL("./assets/pngwing.png", import.meta.url).href,
    available: true,
  },
  {
    id: "sandwich-sanji",
    name: "Sándwich Sanji",
    description:
      "Inspirado en el chef del East Blue: pollo teriyaki, vegetales frescos y pan de centeno.",
    price: 9.95,
    category: "Sandwiches",
    image: new URL("./assets/aesthetic-one-piece-sanji-clipart-sticker.png", import.meta.url).href,
    available: false,
  },
  {
    id: "pizza-napolitana",
    name: "Pizza Napolitana",
    description:
      "Masa madre horneada en piedra con salsa de tomate italiana, mozzarella y albahaca.",
    price: 15.2,
    category: "Pizzas",
    image: new URL("./assets/pizza.com", import.meta.url).href,
    available: true,
  },
  {
    id: "ensalada-chef",
    name: "Ensalada del Chef",
    description:
      "Mix de hojas verdes, vegetales orgánicos, pollo grillado y vinagreta cítrica.",
    price: 8.4,
    category: "Ensaladas",
    image: new URL("./assets/chef.jpg", import.meta.url).href,
    available: true,
  },
  {
    id: "combo-familiar",
    name: "Combo Familiar",
    description:
      "Hamburguesas dobles, papas grandes y gaseosas artesanales para compartir en familia.",
    price: 28.9,
    category: "Combos",
    image: new URL("./assets/pancho.com", import.meta.url).href,
    available: true,
  },
  {
    id: "wrap-vegetariano",
    name: "Wrap Vegetariano",
    description:
      "Wrap integral con hummus, vegetales grillados, hojas verdes y reducción balsámica.",
    price: 7.6,
    category: "Sandwiches",
    image: new URL("./assets/huevito.com", import.meta.url).href,
    available: true,
  },
]

const cartStorageKey = "storeCartItems"

const searchInput = document.getElementById("search") as HTMLInputElement
const productGrid = document.getElementById("product-grid") as HTMLDivElement
const resultsCount = document.getElementById("results-count") as HTMLParagraphElement
const sortSelect = document.getElementById("sort") as HTMLSelectElement
const categoryList = document.getElementById("category-list") as HTMLUListElement
const sidebar = document.getElementById("sidebar") as HTMLElement
const sidebarToggle = document.getElementById("sidebar-toggle") as HTMLButtonElement
const sidebarClose = document.getElementById("sidebar-close") as HTMLButtonElement
const cartBadge = document.getElementById("cart-badge") as HTMLSpanElement

const state = {
  search: "",
  category: "all",
  sort: "name-asc",
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
        quantity: typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0,
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

const buildCategories = () => {
  const uniqueCategories = Array.from(new Set(products.map((product) => product.category)))
  const categories = ["all", ...uniqueCategories]

  categoryList.innerHTML = ""

  categories.forEach((category) => {
    const listItem = document.createElement("li")
    const button = document.createElement("button")

    const isAll = category === "all"
    button.textContent = isAll ? "Todas" : category
    button.type = "button"
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
  const buttons = categoryList.querySelectorAll("button")
  buttons.forEach((button) => {
    const isAll = button.textContent === "Todas"
    const normalized = isAll ? "all" : button.textContent ?? ""
    button.classList.toggle("is-active", normalized === state.category)
  })
}

const renderProducts = () => {
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

  productGrid.innerHTML = ""

  if (!sorted.length) {
    const emptyState = document.createElement("p")
    emptyState.textContent = "No encontramos productos que coincidan con tu búsqueda."
    emptyState.className = "catalog__empty"
    productGrid.appendChild(emptyState)
    return
  }

  sorted.forEach((product) => {
    const card = document.createElement("article")
    card.className = "product-card"
    card.dataset.productId = product.id

    const imageWrapper = document.createElement("div")
    imageWrapper.className = "product-card__image"

    const image = document.createElement("img")
    image.src = product.image
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
    price.textContent = `$${product.price.toFixed(2)}`

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

    productGrid.appendChild(card)
  })
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

const init = () => {
  buildCategories()
  renderProducts()
  updateActiveCategory()
  initEvents()
  updateCartBadge()
}

init()
