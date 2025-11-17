import { Get } from "../../../services/api.ts"
import { checkAuthUsers } from "@utils/auth"
import { readEnv, readEnvOr } from "@utils/env"
import { requireElementById } from "@utils/dom"
import { createNotificationController } from "@utils/notification"
import { formatCurrency, formatDate, formatDateLong } from "@utils/format"
import { normalizeNumber, normalizeStatusText, normalizeString, unwrapCollection } from "@utils/normalize"
import { logoutUser } from "@utils/localStorage"
import type { ClientOrder, OrderDeliveryInfo, OrderProduct, OrderStatus } from "@models/IOrders"

interface OrdersState {
  orders: AdminOrder[]
  filter: OrderStatus | "all"
  isLoading: boolean
  error: string | null
  selectedOrder: AdminOrder | null
  isUpdating: boolean
}

interface StatusVisualConfig {
  label: string
  badgeClass: string
  icon: string
}

interface OrderCustomerInfo {
  name: string
  email?: string
  phone?: string
  document?: string
}

interface OrderPaymentInfo {
  method?: string
  status?: string
  reference?: string
  details?: string
}

interface AdminOrder extends ClientOrder {
  customer: OrderCustomerInfo
  payment?: OrderPaymentInfo
  notes?: string
}

const adminOrdersUrl = readEnv("VITE_API_URL_ADMIN_ORDERS")
const clientOrdersUrl = readEnv("VITE_API_URL_CLIENT_ORDERS")

const ORDERS_API_URL = adminOrdersUrl ?? clientOrdersUrl ?? ""
const ORDER_STATUS_API_URL = readEnvOr("VITE_API_URL_ADMIN_ORDER_STATUS", ORDERS_API_URL)
const ORDER_STATUS_METHOD = readEnvOr("VITE_API_ADMIN_ORDER_STATUS_METHOD", "PATCH").toUpperCase()

type EstadoBackend = "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "TERMINADO"

const ORDER_STATUS_API_VALUES: Record<OrderStatus, EstadoBackend> = {
  pending: "PENDIENTE",
  processing: "CONFIRMADO", // En preparación
  completed: "TERMINADO",
  cancelled: "CANCELADO",
}

const STATUS_CONFIG: Record<OrderStatus, StatusVisualConfig> = {
  pending: {
    label: "Pendiente",
    icon: "⏳",
    badgeClass: "status-badge--pending",
  },
  processing: {
    label: "En preparación",
    icon: "👨‍🍳",
    badgeClass: "status-badge--processing",
  },
  completed: {
    label: "Completado",
    icon: "✅",
    badgeClass: "status-badge--completed",
  },
  cancelled: {
    label: "Cancelado",
    icon: "❌",
    badgeClass: "status-badge--cancelled",
  },
}

const state: OrdersState = {
  orders: [],
  filter: "all",
  isLoading: false,
  error: null,
  selectedOrder: null,
  isUpdating: false,
}

const elements = {
  notification: requireElementById<HTMLDivElement>("notification"),
  ordersContainer: requireElementById<HTMLElement>("orders-container"),
  statusFilter: requireElementById<HTMLSelectElement>("status-filter"),
  ordersCount: requireElementById<HTMLParagraphElement>("orders-count"),
  logoutButton: document.getElementById("logout-button") as HTMLButtonElement | null,
  orderModal: requireElementById<HTMLDialogElement>("order-modal"),
  orderModalTitle: requireElementById<HTMLHeadingElement>("order-modal-title"),
  orderModalSubtitle: requireElementById<HTMLParagraphElement>("order-modal-subtitle"),
  orderModalBody: requireElementById<HTMLDivElement>("order-modal-body"),
  orderModalClose: requireElementById<HTMLButtonElement>("order-modal-close"),
  orderModalCancel: requireElementById<HTMLButtonElement>("order-modal-cancel"),
  orderModalUpdate: requireElementById<HTMLButtonElement>("order-modal-update"),
  orderModalError: requireElementById<HTMLParagraphElement>("order-modal-error"),
  orderStatusSelect: requireElementById<HTMLSelectElement>("order-status-select"),
} as const

const { reset: resetNotification, show: showNotification } = createNotificationController(elements.notification)

const adaptStatus = (value: unknown): OrderStatus => {
  const normalizedValue = normalizeString(value)
  if (!normalizedValue) {
    return "pending"
  }

  const normalized = normalizeStatusText(normalizedValue)
  const exactMatches: Record<string, OrderStatus> = {
  pending: "pending",
  pendiente: "pending",
  "pendiente de pago": "pending",

  confirmado: "processing",
  terminado: "completed",

  processing: "processing",
  preparando: "processing",
  preparacion: "processing",
  "en preparacion": "processing",
  "en preparación": "processing",
  procesando: "processing",

  completed: "completed",
  completado: "completed",
  completo: "completed",
  entregado: "completed",
  finalizado: "completed",

  cancelled: "cancelled",
  cancelado: "cancelled",
  anulado: "cancelled",
  rechazado: "cancelled",
}

  if (normalized in exactMatches) {
    return exactMatches[normalized]
  }

  const keywords: Array<{ keyword: string; status: OrderStatus }> = [
    { keyword: "pend", status: "pending" },
    { keyword: "prep", status: "processing" },
    { keyword: "proc", status: "processing" },
    { keyword: "complet", status: "completed" },
    { keyword: "entreg", status: "completed" },
    { keyword: "final", status: "completed" },
    { keyword: "cancel", status: "cancelled" },
    { keyword: "anula", status: "cancelled" },
    { keyword: "rechaz", status: "cancelled" },
  ]

  for (const { keyword, status } of keywords) {
    if (normalized.includes(keyword)) {
      return status
    }
  }

  return "pending"
}

const computeProductsSubtotal = (products: OrderProduct[]): number =>
  products.reduce((total, product) => total + product.price * product.quantity, 0)

const adaptProducts = (value: unknown): OrderProduct[] => {
  if (!value) {
    return []
  }

  const rawItems = Array.isArray(value) ? value : [value]

  return rawItems
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null
      }

      const record = item as Record<string, unknown>

      const id = normalizeString(record.id ?? record.productId ?? record.codigo ?? record.sku ?? index)

      const name = normalizeString(
        record.name ??
          record.nombre ??
          record.titulo ??
          record.productName ??
          record.nombreProducto // 👈 súper importante para tu back
      )

      const quantity = normalizeNumber(record.quantity ?? record.cantidad ?? record.qty ?? 1) ?? 1

      // Intentamos leer precio unitario
      let price =
        normalizeNumber(
          record.price ??
            record.precio ??
            record.valor ??
            record.unitPrice ??
            record.precioUnitario,
        ) ?? undefined

      // Si no viene precio, calculamos precio = subtotal / cantidad
      if (price == null) {
        const lineSubtotal = normalizeNumber(
          record.subtotal ?? record.montoSubtotal ?? record.totalLinea ?? record.importe,
        )
        if (lineSubtotal != null) {
          price = lineSubtotal / quantity
        } else {
          price = 0
        }
      }

      const imageUrl = normalizeString(record.image ?? record.imagen ?? record.thumbnail ?? record.foto)

      const product: OrderProduct = {
        id: id ?? `producto-${index}`,
        name: name ?? "Producto sin nombre",
        quantity,
        price: Number.isFinite(price) ? price : 0,
      }

      if (imageUrl) {
        product.image = imageUrl
      }

      return product
    })
    .filter((product): product is OrderProduct => product !== null)
}

const adaptDelivery = (value: unknown): OrderDeliveryInfo | undefined => {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const record = value as Record<string, unknown>
  const method = normalizeString(record.method ?? record.tipo ?? record.modalidad ?? record.deliveryMethod ?? record.envio)
  const address = normalizeString(
    record.address ??
      record.direccion ??
      record.domicilio ??
      record.location ??
      record.ubicacion ??
      [record.calle, record.numero, record.ciudad, record.provincia, record.codigoPostal]
        .map((part) => normalizeString(part))
        .filter(Boolean)
        .join(" ")
  )
  const reference = normalizeString(record.reference ?? record.referencia ?? record.detalle ?? record.indicaciones)
  const contactName = normalizeString(record.contactName ?? record.nombreContacto ?? record.recibe ?? record.contacto)
  const contactPhone = normalizeString(
    record.contactPhone ?? record.telefono ?? record.phone ?? record.telefonoContacto ?? record.celular ?? record.phoneNumber,
  )
  const notes = normalizeString(record.notes ?? record.nota ?? record.observaciones ?? record.comentarios)
  const scheduledAt = normalizeString(record.scheduledAt ?? record.deliveryDate ?? record.fechaEntrega ?? record.horario ?? record.programado)

  const delivery: OrderDeliveryInfo = {
    method,
    address,
    reference,
    contactName,
    contactPhone,
    notes,
    scheduledAt,
  }

  const hasInformation = Object.values(delivery).some((detail) => Boolean(detail))
  return hasInformation ? delivery : undefined
}

const adaptCustomer = (record: Record<string, unknown>): OrderCustomerInfo => {
  const customerRaw = record.customer ?? record.cliente ?? record.usuario ?? record.user ?? record.buyer ?? record.persona
  const customerRecord =
    customerRaw && typeof customerRaw === "object" ? (customerRaw as Record<string, unknown>) : record

  const firstName = normalizeString(
    customerRecord.firstName ??
      customerRecord.nombre ??
      customerRecord.name ??
      customerRecord.primerNombre ??
      record.nombreUsuario // 👈 viene del back
  )

  const lastName = normalizeString(
    customerRecord.lastName ?? customerRecord.apellido ?? customerRecord.surname ?? customerRecord.segundoNombre,
  )

  const fullNameCandidate = normalizeString(
    customerRecord.fullName ??
      customerRecord.displayName ??
      customerRecord.razonSocial ??
      record.customerName ??
      record.nombreCliente ??
      record.nombre ??
      record.nombreUsuario // 👈 fallback
  )

  const name = [firstName, lastName].filter(Boolean).join(" ") || fullNameCandidate || "Cliente sin nombre"

  const email = normalizeString(
    customerRecord.email ?? customerRecord.mail ?? record.customerEmail ?? record.emailCliente ?? record.email,
  )
  const phone = normalizeString(
    customerRecord.phone ??
      customerRecord.telefono ??
      customerRecord.phoneNumber ??
      customerRecord.celular ??
      record.customerPhone ??
      record.telefonoCliente ??
      record.telefono,
  )
  const document = normalizeString(
    customerRecord.document ??
      customerRecord.documento ??
      customerRecord.dni ??
      customerRecord.cuit ??
      customerRecord.identificacion ??
      record.document ??
      record.documento ??
      record.dniCliente,
  )

  return { name, email, phone, document }
}

const adaptPaymentInfo = (value: unknown, record: Record<string, unknown>): OrderPaymentInfo | undefined => {
  if (!value) {
    const method = normalizeString(
      record.paymentMethod ?? record.metodoPago ?? record.metodo ?? record.formaPago ?? record.medioPago ?? record.pago,
    )
    const status = normalizeString(record.paymentStatus ?? record.estadoPago ?? record.statusPago ?? record.paymentState)
    const reference = normalizeString(record.paymentReference ?? record.referenciaPago ?? record.transactionId ?? record.codigoOperacion)
    const details = normalizeString(record.paymentDetails ?? record.detallePago ?? record.descripcionPago ?? record.detallesPago)

    const fallback: OrderPaymentInfo = { method, status, reference, details }
    const hasInfo = Object.values(fallback).some((info) => Boolean(info))
    return hasInfo ? fallback : undefined
  }

  if (typeof value === "string") {
    const method = normalizeString(value)
    return method ? { method } : undefined
  }

  if (typeof value === "object") {
    const paymentRecord = value as Record<string, unknown>
    const method = normalizeString(
      paymentRecord.method ??
        paymentRecord.metodo ??
        paymentRecord.metodoPago ??
        paymentRecord.forma ??
        paymentRecord.formaPago ??
        record.paymentMethod ??
        record.metodoPago,
    )
    const status = normalizeString(
      paymentRecord.status ?? paymentRecord.estado ?? paymentRecord.estadoPago ?? record.paymentStatus ?? record.estadoPago,
    )
    const reference = normalizeString(
      paymentRecord.reference ??
        paymentRecord.referencia ??
        paymentRecord.transactionId ??
        paymentRecord.codigo ??
        record.paymentReference ??
        record.referenciaPago,
    )
    const details = normalizeString(
      paymentRecord.details ?? paymentRecord.detalle ?? paymentRecord.descripcion ?? record.paymentDetails ?? record.detallePago,
    )

    const info: OrderPaymentInfo = { method, status, reference, details }
    const hasInformation = Object.values(info).some((detail) => Boolean(detail))
    return hasInformation ? info : undefined
  }

  return undefined
}

const adaptNotes = (record: Record<string, unknown>): string | undefined =>
  normalizeString(
    record.notes ??
      record.nota ??
      record.observaciones ??
      record.comentarios ??
      record.comentario ??
      record.mensajeCliente ??
      record.notaCliente,
  )

  const SHIPPING_FEE = 500

const adaptCosts = (_record: Record<string, unknown>, products: OrderProduct[]) => {
  const computedSubtotal = computeProductsSubtotal(products)
  const computedShipping = SHIPPING_FEE
  const computedDiscount = 0
  const computedTotal = computedSubtotal + computedShipping - computedDiscount

  return {
    subtotal: computedSubtotal,
    shipping: computedShipping,
    discount: computedDiscount,
    total: computedTotal,
  }
}

const adaptOrder = (value: unknown, index: number): AdminOrder | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const id = normalizeString(record.id ?? record.orderId ?? record.codigo ?? record.uuid ?? record.numeroPedido)
  const number = normalizeString(record.number ?? record.numero ?? record.codigo ?? record.referencia ?? id)
  const createdAt = normalizeString(
    record.createdAt ??
      record.fechaCreacion ??
      record.fecha ??
      record.fechaPedido ??
      record.created ??
      record.timestamp,
  )

  const products = adaptProducts(
    record.products ?? record.items ?? record.detalle ?? record.detalles ?? record.lineItems ?? record.lineas,
  )

  const costs = adaptCosts(record, products)

  const delivery = adaptDelivery(record.delivery ?? record.envio ?? record.shipping ?? record.direccion ?? record.address)
  const message = normalizeString(
    record.message ?? record.mensaje ?? record.estadoMensaje ?? record.statusMessage ?? record.observacion ?? record.nota,
  )

  const identifier = id ?? number ?? createdAt ?? `pedido-${index}`
  const orderNumber = number ?? identifier
  const orderDate = createdAt ?? new Date().toISOString()

  const customer = adaptCustomer(record)
  const payment = adaptPaymentInfo(record.payment ?? record.metodoPago ?? record.pago ?? record.metodo, record)
  const notes = adaptNotes(record)

  return {
    id: identifier,
    number: orderNumber,
    createdAt: orderDate,
    status: adaptStatus(record.status ?? record.estado ?? record.state),
    products,
    subtotal: costs.subtotal,
    shipping: costs.shipping,
    discount: costs.discount,
    total: costs.total,
    delivery,
    message,
    customer,
    payment,
    notes,
  }
}

const adaptOrders = (value: unknown): AdminOrder[] => {
  const collection = unwrapCollection(value)
  const parsed = collection
    .map((item, index) => adaptOrder(item, index))
    .filter((item): item is AdminOrder => Boolean(item))

  return parsed.sort((a, b) => {
    const aTime = Date.parse(a.createdAt)
    const bTime = Date.parse(b.createdAt)
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
      return bTime - aTime
    }

    return a.number.localeCompare(b.number)
  })
}

const formatOrderDate = (value: string): string => {
  const formatted = formatDate(value, { dateStyle: "medium", timeStyle: "short" })
  return formatted || value
}

const formatOrderDateLong = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }
  return formatDateLong(value, { dateStyle: "long", timeStyle: "short" }) ?? value
}

const getProductsCount = (order: ClientOrder): number =>
  order.products.reduce((count, product) => count + product.quantity, 0)

const formatProductsCount = (order: ClientOrder): string => {
  const count = getProductsCount(order)
  return count === 1 ? "1 producto" : `${count} productos`
}

const createStatusBadge = (status: OrderStatus): HTMLSpanElement => {
  const config = STATUS_CONFIG[status]
  const badge = document.createElement("span")
  badge.className = `status-badge ${config.badgeClass}`

  const icon = document.createElement("span")
  icon.className = "status-badge__icon"
  icon.textContent = config.icon

  const label = document.createElement("span")
  label.className = "status-badge__label"
  label.textContent = config.label

  badge.append(icon, label)
  return badge
}

const createLoadingElement = (): HTMLElement => {
  const wrapper = document.createElement("div")
  wrapper.className = "orders-loading"

  const spinner = document.createElement("span")
  spinner.className = "orders-loading__spinner"

  const message = document.createElement("p")
  message.className = "orders-loading__message"
  message.textContent = "Cargando pedidos..."

  wrapper.append(spinner, message)
  return wrapper
}

const createErrorElement = (message: string): HTMLElement => {
  const wrapper = document.createElement("div")
  wrapper.className = "orders-error"

  const title = document.createElement("p")
  title.className = "orders-error__title"
  title.textContent = "No se pudieron cargar los pedidos"

  const description = document.createElement("p")
  description.className = "orders-error__message"
  description.textContent = message

  const button = document.createElement("button")
  button.className = "orders-error__retry"
  button.type = "button"
  button.textContent = "Reintentar"
  button.addEventListener("click", () => {
    void loadOrders()
  })

  wrapper.append(title, description, button)
  return wrapper
}

const createEmptyElement = (hasOrders: boolean): HTMLElement => {
  const wrapper = document.createElement("div")
  wrapper.className = "orders-empty"

  const title = document.createElement("p")
  title.className = "orders-empty__title"
  title.textContent = hasOrders
    ? "No hay pedidos con este estado"
    : "Aún no se registraron pedidos"

  const description = document.createElement("p")
  description.className = "orders-empty__message"
  description.textContent = hasOrders
    ? "No encontramos pedidos con el filtro seleccionado."
    : "Los pedidos aparecerán aquí cuando los clientes completen una compra."

  wrapper.append(title, description)
  return wrapper
}

const createOrderCard = (order: AdminOrder): HTMLElement => {
  const card = document.createElement("article")
  card.className = "order-card"
  card.tabIndex = 0

  const header = document.createElement("div")
  header.className = "order-card__header"

  const infoWrapper = document.createElement("div")

  const number = document.createElement("p")
  number.className = "order-card__number"
  number.textContent = `Pedido #${order.number}`

  const customer = document.createElement("p")
  customer.className = "order-card__customer"
  customer.textContent = order.customer.name

  infoWrapper.append(number, customer)

  const statusBadge = createStatusBadge(order.status)

  header.append(infoWrapper, statusBadge)

  const metaList = document.createElement("dl")
  metaList.className = "order-card__meta"

  const metaItems: Array<{ label: string; value: string }> = [
    { label: "Fecha", value: formatOrderDate(order.createdAt) },
    { label: "Productos", value: formatProductsCount(order) },
    { label: "Total", value: formatCurrency(order.total) },
  ]

  metaItems.forEach(({ label, value }) => {
    const item = document.createElement("div")
    item.className = "order-card__meta-item"

    const dt = document.createElement("dt")
    dt.textContent = label

    const dd = document.createElement("dd")
    dd.textContent = value

    item.append(dt, dd)
    metaList.append(item)
  })

  card.append(header, metaList)

  card.addEventListener("click", () => {
    openModal(order)
  })

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      openModal(order)
    }
  })

  return card
}

const renderOrdersCount = (filteredOrders: AdminOrder[]) => {
  const total = state.orders.length
  if (!total) {
    elements.ordersCount.textContent = ""
    return
  }

  const filtered = filteredOrders.length
  if (filtered === total) {
    elements.ordersCount.textContent = `${total} pedido${total === 1 ? "" : "s"}`
  } else {
    elements.ordersCount.textContent = `Mostrando ${filtered} de ${total} pedidos`
  }
}

const renderOrders = () => {
  elements.ordersContainer.innerHTML = ""
  elements.ordersContainer.setAttribute("aria-busy", state.isLoading ? "true" : "false")

  if (state.isLoading) {
    elements.ordersContainer.appendChild(createLoadingElement())
    elements.ordersCount.textContent = ""
    return
  }

  if (state.error) {
    elements.ordersContainer.appendChild(createErrorElement(state.error))
    elements.ordersCount.textContent = ""
    return
  }

  const filteredOrders = state.filter === "all"
    ? [...state.orders]
    : state.orders.filter((order) => order.status === state.filter)

  renderOrdersCount(filteredOrders)

  if (!filteredOrders.length) {
    const hasOrders = Boolean(state.orders.length)
    elements.ordersContainer.appendChild(createEmptyElement(hasOrders))
    return
  }

  const fragment = document.createDocumentFragment()
  filteredOrders.forEach((order) => {
    fragment.appendChild(createOrderCard(order))
  })

  elements.ordersContainer.appendChild(fragment)
}

const buildOrderStatusEndpoint = (template: string, orderId: string, status: OrderStatus): string => {
  const encodedId = encodeURIComponent(orderId)
  const encodedStatus = encodeURIComponent(status)
  const hasIdPlaceholder = /{orderId}|:orderId|{id}|:id/.test(template)
  const hasStatusPlaceholder = /{status}|:status/.test(template)

  let endpoint = template
    .replace(/{orderId}/g, encodedId)
    .replace(/:orderId/g, encodedId)
    .replace(/{id}/g, encodedId)
    .replace(/:id/g, encodedId)

  if (!hasIdPlaceholder) {
    endpoint = endpoint.endsWith("/") ? `${endpoint}${encodedId}` : `${endpoint}/${encodedId}`
  }

  if (hasStatusPlaceholder) {
    endpoint = endpoint.replace(/{status}/g, encodedStatus).replace(/:status/g, encodedStatus)
  }

  return endpoint
}

const setModalLoading = (loading: boolean) => {
  state.isUpdating = loading
  elements.orderStatusSelect.disabled = loading
  elements.orderModalUpdate.disabled = loading
  elements.orderModalCancel.disabled = loading
  elements.orderModalClose.disabled = loading
  elements.orderModalUpdate.textContent = loading ? "Actualizando..." : "Actualizar estado"
}

const closeModal = () => {
  if (elements.orderModal.open) {
    elements.orderModal.close()
  }
  state.selectedOrder = null
  elements.orderModalError.textContent = ""
  elements.orderModalUpdate.textContent = "Actualizar estado"
  elements.orderStatusSelect.disabled = false
  elements.orderModalUpdate.disabled = false
  elements.orderModalCancel.disabled = false
  elements.orderModalClose.disabled = false
}

const createInfoSection = (
  title: string,
  items: Array<{ label: string; value: string | undefined }>,
): HTMLElement | null => {
  const filtered = items.filter((item): item is { label: string; value: string } => Boolean(item.value))
  if (!filtered.length) {
    return null
  }

  const section = document.createElement("section")
  section.className = "order-modal__section"

  const heading = document.createElement("h3")
  heading.className = "order-modal__section-title"
  heading.textContent = title

  const list = document.createElement("ul")
  list.className = "order-modal__info-list"

  filtered.forEach(({ label, value }) => {
    const item = document.createElement("li")
    item.className = "order-modal__info-item"

    const labelEl = document.createElement("span")
    labelEl.className = "order-modal__info-label"
    labelEl.textContent = label

    const valueEl = document.createElement("span")
    valueEl.textContent = value

    item.append(labelEl, valueEl)
    list.appendChild(item)
  })

  section.append(heading, list)
  return section
}

const createProductsSection = (order: AdminOrder): HTMLElement | null => {
  if (!order.products.length) {
    return null
  }

  const section = document.createElement("section")
  section.className = "order-modal__section"

  const heading = document.createElement("h3")
  heading.className = "order-modal__section-title"
  heading.textContent = "Productos"

  const productsWrapper = document.createElement("div")
  productsWrapper.className = "order-modal__products"

  order.products.forEach((product) => {
    const item = document.createElement("article")
    item.className = "order-modal__product-item"

    const nameWrapper = document.createElement("div")

    const name = document.createElement("p")
    name.className = "order-modal__product-name"
    name.textContent = product.name

    const meta = document.createElement("p")
    meta.className = "order-modal__product-meta"
    meta.textContent = `${product.quantity} × ${formatCurrency(product.price)}`

    nameWrapper.append(name, meta)

    const total = document.createElement("p")
    total.className = "order-modal__product-total"
    total.textContent = formatCurrency(product.price * product.quantity)

    item.append(nameWrapper, total)
    productsWrapper.appendChild(item)
  })

  section.append(heading, productsWrapper)
  return section
}

const createCostsSection = (order: AdminOrder): HTMLElement => {
  const section = document.createElement("section")
  section.className = "order-modal__section"

  const heading = document.createElement("h3")
  heading.className = "order-modal__section-title"
  heading.textContent = "Resumen de costos"

  const wrapper = document.createElement("div")
  wrapper.className = "order-modal__costs"

  const rows: Array<{ label: string; value: string; emphasis?: boolean }> = [
    { label: "Subtotal", value: formatCurrency(order.subtotal) },
    { label: "Envío", value: formatCurrency(order.shipping) },
  ]

  if (order.discount) {
    rows.push({ label: "Descuento", value: `- ${formatCurrency(order.discount)}` })
  }

  rows.push({ label: "Total", value: formatCurrency(order.total), emphasis: true })

  rows.forEach(({ label, value, emphasis }) => {
    const row = document.createElement("div")
    row.className = "order-modal__cost-row"
    if (emphasis) {
      row.classList.add("order-modal__cost-row--total")
    }

    const labelEl = document.createElement("span")
    labelEl.className = "order-modal__cost-label"
    labelEl.textContent = label

    const valueEl = document.createElement("span")
    valueEl.textContent = value

    row.append(labelEl, valueEl)
    wrapper.appendChild(row)
  })

  section.append(heading, wrapper)
  return section
}

const renderModalContent = (order: AdminOrder) => {
  elements.orderModalTitle.textContent = `Pedido #${order.number}`
  elements.orderModalSubtitle.textContent = `Creado el ${formatOrderDate(order.createdAt)}`

  elements.orderStatusSelect.value = order.status
  elements.orderModalError.textContent = ""

  const sections: Array<HTMLElement> = []

  const customerSection = createInfoSection("Información del cliente", [
    { label: "Nombre", value: order.customer.name },
    { label: "Correo", value: order.customer.email },
    { label: "Teléfono", value: order.customer.phone },
    { label: "Documento", value: order.customer.document },
  ])
  if (customerSection) {
    sections.push(customerSection)
  }

  const delivery = order.delivery ?? ({} as OrderDeliveryInfo)
  const deliverySection = createInfoSection("Entrega", [
    { label: "Dirección", value: delivery.address },
    { label: "Referencia", value: delivery.reference },
    { label: "Contacto", value: delivery.contactName },
    { label: "Teléfono", value: delivery.contactPhone },
    { label: "Programado", value: formatOrderDateLong(delivery.scheduledAt) },
    { label: "Método", value: delivery.method },
  ])
  if (deliverySection) {
    sections.push(deliverySection)
  }

  const paymentSection = order.payment
    ? createInfoSection("Método de pago", [
        { label: "Método", value: order.payment.method },
        { label: "Estado", value: order.payment.status },
        { label: "Referencia", value: order.payment.reference },
        { label: "Detalle", value: order.payment.details },
      ])
    : null
  if (paymentSection) {
    sections.push(paymentSection)
  }

  const notesText = order.notes ?? order.message
  if (notesText) {
    const notesSection = document.createElement("section")
    notesSection.className = "order-modal__section"

    const heading = document.createElement("h3")
    heading.className = "order-modal__section-title"
    heading.textContent = "Notas del cliente"

    const notes = document.createElement("p")
    notes.className = "order-modal__notes"
    notes.textContent = notesText

    notesSection.append(heading, notes)
    sections.push(notesSection)
  }

  const productsSection = createProductsSection(order)
  if (productsSection) {
    sections.push(productsSection)
  }

  sections.push(createCostsSection(order))

  elements.orderModalBody.replaceChildren(...sections)
}

const openModal = (order: AdminOrder) => {
  state.selectedOrder = order
  renderModalContent(order)
  if (!elements.orderModal.open) {
    elements.orderModal.showModal()
  }
}

const updateOrderInState = (updated: AdminOrder) => {
  state.orders = state.orders.map((order) => (order.id === updated.id ? { ...order, ...updated } : order))
  if (state.selectedOrder && state.selectedOrder.id === updated.id) {
    state.selectedOrder = { ...state.selectedOrder, ...updated }
  }
}

const updateOrderStatus = async (order: AdminOrder, newStatus: OrderStatus) => {
  if (!ORDER_STATUS_API_URL) {
    elements.orderModalError.textContent = "No hay una URL configurada para actualizar el pedido."
    return
  }

  if (order.status === newStatus) {
    elements.orderModalError.textContent = "El pedido ya tiene el estado seleccionado."
    return
  }

  // El back espera un Long como ID de pedido
  const pedidoId = Number(order.id)
  if (!Number.isFinite(pedidoId)) {
    elements.orderModalError.textContent = "El ID del pedido no es válido."
    return
  }

  const apiStatus = ORDER_STATUS_API_VALUES[newStatus]

  try {
    setModalLoading(true)
    elements.orderModalError.textContent = ""

    // 👉 OJO: la URL es fija: /api/pedidos/estado
    const endpoint = ORDER_STATUS_API_URL

    console.log("Actualizando pedido", pedidoId, "=>", apiStatus, "URL:", endpoint)

    const response = await fetch(endpoint, {
      method: ORDER_STATUS_METHOD === "PUT" ? "PUT" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pedidoId,        // coincide con PedidoUpdateDTO.pedidoId
        nuevoEstado: apiStatus, // coincide con PedidoUpdateDTO.nuevoEstado
      }),
    })

    let payload: unknown
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      payload = await response.json()
    } else {
      payload = await response.text()
    }

    if (!response.ok) {
      console.error("Error HTTP al actualizar estado:", response.status, payload)
      const message =
        typeof payload === "string"
          ? payload
          : payload && typeof payload === "object" && "mensaje" in payload
            ? normalizeString((payload as { mensaje?: string }).mensaje)
            : null

      throw new Error(message ?? "No se pudo actualizar el estado del pedido.")
    }

    let updatedOrder: AdminOrder | null = null
    if (payload && typeof payload === "object") {
      const adapted = adaptOrder(payload, 0)
      if (adapted) {
        updatedOrder = adapted
      }
    }

    const mergedOrder: AdminOrder = updatedOrder
      ? { ...order, ...updatedOrder, status: updatedOrder.status }
      : { ...order, status: newStatus }

    updateOrderInState(mergedOrder)
    renderOrders()

    if (state.selectedOrder) {
      renderModalContent(state.selectedOrder)
    }

    showNotification(`El estado del pedido #${order.number} se actualizó correctamente.`, "success")
  } catch (error) {
    console.error("No se pudo actualizar el estado del pedido", error)
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Ocurrió un error al actualizar el estado del pedido."
    elements.orderModalError.textContent = message
  } finally {
    setModalLoading(false)
  }
}


const loadOrders = async () => {
  resetNotification()
  state.isLoading = true
  state.error = null
  renderOrders()

  try {
    if (!ORDERS_API_URL) {
      throw new Error("No se configuró la URL para obtener los pedidos.")
    }

    const { data, error } = await Get<unknown>(ORDERS_API_URL)
    if (error) {
      throw new Error(error.mensaje ?? "No se pudieron obtener los pedidos.")
    }

    const orders = adaptOrders(data)
    state.orders = orders
    state.error = null
  } catch (error) {
    console.error("Error al cargar los pedidos", error)
    state.orders = []
    state.error = error instanceof Error && error.message
      ? error.message
      : "Ocurrió un error inesperado al cargar los pedidos."
  } finally {
    state.isLoading = false
    renderOrders()
  }
}

const initEventListeners = () => {
  elements.statusFilter.addEventListener("change", () => {
    const value = elements.statusFilter.value as OrderStatus | "all"
    state.filter = value
    renderOrders()
  })

  elements.orderModalClose.addEventListener("click", () => {
    closeModal()
  })

  elements.orderModalCancel.addEventListener("click", () => {
    closeModal()
  })

  elements.orderModal.addEventListener("cancel", (event) => {
    event.preventDefault()
    closeModal()
  })

  elements.orderModal.addEventListener("close", () => {
    state.selectedOrder = null
  })

  elements.orderModalUpdate.addEventListener("click", () => {
    if (!state.selectedOrder) {
      return
    }
    const value = elements.orderStatusSelect.value as OrderStatus
    void updateOrderStatus(state.selectedOrder, value)
  })

  if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", () => {
      logoutUser()
      checkAuthUsers("ADMINISTRADOR", "/src/pages/auth/login/login.html")
    })
  }
}

const initOrdersPage = () => {
  checkAuthUsers("ADMINISTRADOR", "/src/pages/auth/login/login.html")
  initEventListeners()
  void loadOrders()
}

initOrdersPage()