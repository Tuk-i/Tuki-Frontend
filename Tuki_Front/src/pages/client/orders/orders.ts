import { Get } from "../../../services/api.ts";
import { checkAuthUsers } from "@utils/auth";
import type { ClientOrder, OrderDeliveryInfo, OrderProduct, OrderStatus } from "@models/IOrders";
import type { IUsuarioLogin } from "@models/IUsuarios/IUsuarioLogin";

interface OrdersState {
  orders: ClientOrder[];
  isLoading: boolean;
  error: string | null;
  selectedOrder: ClientOrder | null;
}

interface StatusVisualConfig {
  label: string;
  icon: string;
  badgeClass: string;
  message: string;
}

const STATUS_CONFIG: Record<OrderStatus, StatusVisualConfig> = {
  pending: {
    label: "Pendiente",
    icon: "⏳",
    badgeClass: "status-badge--pending",
    message: "Recibimos tu pedido y está pendiente de confirmación. Te avisaremos cuando comencemos a prepararlo.",
  },
  processing: {
    label: "En preparación",
    icon: "󰞽",
    badgeClass: "status-badge--processing",
    message: "Estamos preparando tu pedido con mucho cuidado. Te notificaremos cuando salga a entrega.",
  },
  completed: {
    label: "Entregado",
    icon: "✅",
    badgeClass: "status-badge--completed",
    message: "¡Tu pedido fue entregado con éxito! Esperamos que lo disfrutes.",
  },
  cancelled: {
    label: "Cancelado",
    icon: "❌",
    badgeClass: "status-badge--cancelled",
    message: "El pedido fue cancelado. Si necesitás más información, comunicate con nuestro equipo de soporte.",
  },
};

const ORDERS_API_URL = import.meta.env.VITE_API_URL_CLIENT_ORDERS as string | undefined;

const state: OrdersState = {
  orders: [],
  isLoading: false,
  error: null,
  selectedOrder: null,
};

const ordersListElement = document.getElementById("orders-list");
const modalElement = document.getElementById("order-modal");
const modalContentElement = document.getElementById("order-modal-content");
const modalDialogElement = document.getElementById("order-modal-dialog");

if (!(ordersListElement instanceof HTMLElement)) {
  throw new Error("No se encontró el contenedor de pedidos en el DOM.");
}

if (!(modalElement instanceof HTMLDivElement)) {
  throw new Error("No se encontró el modal de pedidos en el DOM.");
}

if (!(modalContentElement instanceof HTMLDivElement)) {
  throw new Error("No se encontró el contenido del modal en el DOM.");
}

if (!(modalDialogElement instanceof HTMLElement)) {
  throw new Error("No se encontró el diálogo del modal en el DOM.");
}

const closeTriggers = modalElement.querySelectorAll<HTMLElement>("[data-close]");

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateTimeLongFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
});

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
};

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const normalized = value.replace(/,/g, ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const normalizeStatusText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const adaptStatus = (value: unknown): OrderStatus => {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) {
    return "pending";
  }

  const normalized = normalizeStatusText(normalizedValue);
  const exactMatches: Record<string, OrderStatus> = {
    pending: "pending",
    pendiente: "pending",
    "pendiente de pago": "pending",
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
  };

  if (normalized in exactMatches) {
    return exactMatches[normalized];
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
  ];

  for (const { keyword, status } of keywords) {
    if (normalized.includes(keyword)) {
      return status;
    }
  }

  return "pending";
};

const unwrapCollection = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = [
      "orders",
      "pedidos",
      "data",
      "items",
      "results",
      "content",
      "lista",
      "list",
      "values",
      "rows",
      "orderList",
    ];

    for (const key of candidates) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    if ("id" in record || "numero" in record || "number" in record || "status" in record || "estado" in record) {
      return [value];
    }
  }

  return [];
};

const adaptProduct = (value: unknown, index: number): OrderProduct | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = normalizeString(
    record.name ?? record.nombre ?? record.descripcion ?? record.title ?? record.producto ?? record.descripcionProducto,
  ) ?? `Producto ${index + 1}`;

  const id =
    normalizeString(record.id ?? record.productId ?? record.codigo ?? record.uuid ?? record.sku) ??
    `${name.toLowerCase().replace(/\s+/g, "-")}-${index}`;

  let quantity = normalizeNumber(record.quantity ?? record.cantidad ?? record.qty ?? record.unidades) ?? 1;
  if (!Number.isFinite(quantity) || quantity <= 0) {
    quantity = 1;
  }

  const unitPrice = normalizeNumber(
    record.unitPrice ?? record.price ?? record.precioUnitario ?? record.precio ?? record.valor ?? record.costo,
  );

  const lineTotal = normalizeNumber(record.total ?? record.monto ?? record.totalLinea ?? record.importe);

  const price = unitPrice ?? (lineTotal !== undefined ? lineTotal / quantity : 0);

  const image = normalizeString(record.image ?? record.imagen ?? record.imageUrl ?? record.urlImagen);

  return {
    id,
    name,
    quantity,
    price: Number.isFinite(price) ? price : 0,
    image,
  };
};

const adaptProducts = (value: unknown): OrderProduct[] => {
  const collection = unwrapCollection(value);
  return collection
    .map((item, index) => adaptProduct(item, index))
    .filter((item): item is OrderProduct => Boolean(item));
};

const computeProductsSubtotal = (products: OrderProduct[]): number =>
  products.reduce((acc, product) => acc + product.price * product.quantity, 0);

const adaptDelivery = (value: unknown): OrderDeliveryInfo | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    const address = value.trim();
    return address ? { address } : undefined;
  }

  if (typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const method = normalizeString(record.method ?? record.tipo ?? record.metodo ?? record.mode ?? record.tipoEntrega);

  const addressCandidate = normalizeString(record.address ?? record.direccion ?? record.street ?? record.calle);
  const number = normalizeString(record.number ?? record.numero);
  const floor = normalizeString(record.floor ?? record.piso);
  const apartment = normalizeString(record.apartment ?? record.departamento ?? record.depto);
  const city = normalizeString(record.city ?? record.ciudad ?? record.localidad);
  const province = normalizeString(record.province ?? record.provincia ?? record.estado);
  const postalCode = normalizeString(record.postalCode ?? record.codigoPostal ?? record.zip);

  const addressParts: string[] = [];
  if (addressCandidate) {
    addressParts.push(
      number ? `${addressCandidate} ${number}` : addressCandidate,
    );
  }

  if (floor || apartment) {
    addressParts.push([floor, apartment].filter(Boolean).join(" "));
  }

  if (city) {
    addressParts.push(city);
  }

  if (province) {
    addressParts.push(province);
  }

  if (postalCode) {
    addressParts.push(postalCode);
  }

  const address = addressParts.length ? addressParts.join(", ") : addressCandidate;

  const contactName = normalizeString(
    record.contactName ?? record.nombre ?? record.receiver ?? record.destinatario ?? record.personaContacto,
  );
  const contactPhone = normalizeString(record.phone ?? record.telefono ?? record.contactPhone ?? record.celular);
  const reference = normalizeString(record.reference ?? record.referencia ?? record.detalle ?? record.indicaciones);
  const notes = normalizeString(record.notes ?? record.nota ?? record.observaciones ?? record.comentarios);
  const scheduledAt = normalizeString(
    record.scheduledAt ?? record.deliveryDate ?? record.fechaEntrega ?? record.horario ?? record.programado,
  );

  const delivery: OrderDeliveryInfo = {
    method,
    address,
    reference,
    contactName,
    contactPhone,
    notes,
    scheduledAt,
  };

  const hasInformation = Object.values(delivery).some((detail) => Boolean(detail));
  return hasInformation ? delivery : undefined;
};

const adaptCosts = (record: Record<string, unknown>, products: OrderProduct[]) => {
  const subtotal = normalizeNumber(
    record.subtotal ?? record.subTotal ?? record.totalProductos ?? record.montoSubtotal ?? record.subtotalProductos,
  );
  const shipping = normalizeNumber(
    record.shipping ?? record.envio ?? record.costoEnvio ?? record.deliveryCost ?? record.costoDeEnvio,
  );
  const discount = normalizeNumber(record.discount ?? record.descuento ?? record.bonificacion ?? record.promocion) ?? 0;
  const total = normalizeNumber(record.total ?? record.totalGeneral ?? record.montoTotal ?? record.precioTotal);

  const computedSubtotal = subtotal ?? computeProductsSubtotal(products);
  const computedShipping = shipping ?? 0;
  const computedTotal = total ?? computedSubtotal + computedShipping - discount;
  const computedDiscount = discount !== undefined ? discount : Math.max(0, computedSubtotal + computedShipping - computedTotal);

  return {
    subtotal: computedSubtotal,
    shipping: computedShipping,
    discount: computedDiscount,
    total: computedTotal,
  };
};

const adaptOrder = (value: unknown, index: number): ClientOrder | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = normalizeString(record.id ?? record.orderId ?? record.codigo ?? record.uuid ?? record.numeroPedido);
  const number = normalizeString(record.number ?? record.numero ?? record.codigo ?? record.referencia ?? id);
  const createdAt = normalizeString(
    record.createdAt ??
      record.fechaCreacion ??
      record.fecha ??
      record.fechaPedido ??
      record.created ??
      record.timestamp,
  );

  const products = adaptProducts(
    record.products ?? record.items ?? record.detalle ?? record.detalles ?? record.lineItems ?? record.lineas,
  );

  const costs = adaptCosts(record, products);

  const delivery = adaptDelivery(record.delivery ?? record.envio ?? record.shipping ?? record.direccion ?? record.address);
  const message = normalizeString(
    record.message ?? record.mensaje ?? record.estadoMensaje ?? record.statusMessage ?? record.observacion ?? record.nota,
  );

  const identifier = id ?? number ?? createdAt ?? `pedido-${index}`;
  const orderNumber = number ?? identifier;
  const orderDate = createdAt ?? new Date().toISOString();

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
  };
};

const adaptOrders = (value: unknown): ClientOrder[] => {
  const collection = unwrapCollection(value);
  const parsed = collection
    .map((item, index) => adaptOrder(item, index))
    .filter((item): item is ClientOrder => Boolean(item));

  return parsed.sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
      return bTime - aTime;
    }

    return a.number.localeCompare(b.number);
  });
};

const formatCurrency = (value: number): string => {
  const rounded = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
  return currencyFormatter.format(rounded);
};

const formatDate = (value: string): string => {
  const timestamp = Date.parse(value);
  if (!Number.isNaN(timestamp)) {
    return dateTimeFormatter.format(new Date(timestamp));
  }
  return value;
};

const formatDateLong = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const timestamp = Date.parse(value);
  if (!Number.isNaN(timestamp)) {
    return dateTimeLongFormatter.format(new Date(timestamp));
  }
  return value;
};

const getCurrentUser = (): IUsuarioLogin | null => {
  const raw = localStorage.getItem("userData");
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<IUsuarioLogin>;
    if (parsed && parsed.loggedIn) {
      return parsed as IUsuarioLogin;
    }
  } catch (error) {
    console.error("No se pudo parsear la sesión del usuario", error);
  }

  return null;
};

const buildOrdersUrl = (template: string, userId: number): string => {
  const userIdText = String(userId);
  if (template.includes("{userId}")) {
    return template.replace("{userId}", userIdText);
  }
  if (template.includes(":userId")) {
    return template.replace(":userId", userIdText);
  }
  if (template.includes("{id}")) {
    return template.replace("{id}", userIdText);
  }
  if (template.includes(":id")) {
    return template.replace(":id", userIdText);
  }
  if (template.includes("?")) {
    const separator = /[?&]$/.test(template) ? "" : "&";
    return `${template}${separator}userId=${encodeURIComponent(userIdText)}`;
  }
  return template.endsWith("/") ? `${template}${userIdText}` : `${template}/${userIdText}`;
};

const setBusy = (busy: boolean) => {
  ordersListElement.setAttribute("aria-busy", busy ? "true" : "false");
};

const createStatusBadge = (status: OrderStatus): HTMLSpanElement => {
  const config = STATUS_CONFIG[status];
  const badge = document.createElement("span");
  badge.className = `status-badge ${config.badgeClass}`;

  const icon = document.createElement("span");
  icon.className = "status-badge__icon";
  icon.textContent = config.icon;

  const label = document.createElement("span");
  label.className = "status-badge__label";
  label.textContent = config.label;

  badge.append(icon, label);
  return badge;
};

const createLoadingElement = (): HTMLElement => {
  const wrapper = document.createElement("div");
  wrapper.className = "orders-loading";

  const spinner = document.createElement("span");
  spinner.className = "orders-loading__spinner";

  const message = document.createElement("p");
  message.className = "orders-loading__message";
  message.textContent = "Cargando pedidos...";

  wrapper.append(spinner, message);
  return wrapper;
};

const createErrorElement = (message: string): HTMLElement => {
  const wrapper = document.createElement("div");
  wrapper.className = "orders-error";

  const title = document.createElement("h2");
  title.className = "orders-error__title";
  title.textContent = "No pudimos cargar los pedidos";

  const description = document.createElement("p");
  description.className = "orders-error__message";
  description.textContent = message;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "orders-error__retry";
  button.textContent = "Reintentar";
  button.addEventListener("click", () => {
    void fetchOrders();
  });

  wrapper.append(title, description, button);
  return wrapper;
};

const createEmptyStateElement = (): HTMLElement => {
  const wrapper = document.createElement("div");
  wrapper.className = "orders-empty";

  const title = document.createElement("h2");
  title.className = "orders-empty__title";
  title.textContent = "Aún no tenés pedidos";

  const description = document.createElement("p");
  description.className = "orders-empty__message";
  description.textContent = "Cuando realices tu primera compra, vas a poder ver el estado y seguimiento desde aquí.";

  const link = document.createElement("a");
  link.className = "orders-empty__cta";
  link.href = "../../store/home/home.html";
  link.innerHTML = '<i class="ri-shopping-bag-3-line" aria-hidden="true"></i><span>Ir al catálogo</span>';

  wrapper.append(title, description, link);
  return wrapper;
};

const createOrderCard = (order: ClientOrder): HTMLElement => {
  const card = document.createElement("article");
  card.className = "order-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Ver detalle del pedido ${order.number}`);

  const header = document.createElement("header");
  header.className = "order-card__header";

  const number = document.createElement("h2");
  number.className = "order-card__number";
  number.textContent = `Pedido #${order.number}`;

  const statusBadge = createStatusBadge(order.status);
  statusBadge.classList.add("order-card__status");

  header.append(number, statusBadge);

  const date = document.createElement("time");
  date.className = "order-card__date";
  date.dateTime = order.createdAt;
  date.textContent = formatDate(order.createdAt);

  const productsWrapper = document.createElement("div");
  productsWrapper.className = "order-card__products";

  const summaryList = document.createElement("ul");
  summaryList.className = "order-card__summary";

  if (order.products.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Sin productos registrados";
    summaryList.appendChild(emptyItem);
  } else {
    order.products.slice(0, 3).forEach((product) => {
      const item = document.createElement("li");
      item.textContent = `${product.quantity} × ${product.name}`;
      summaryList.appendChild(item);
    });

    if (order.products.length > 3) {
      const extra = document.createElement("li");
      extra.textContent = `+${order.products.length - 3} producto(s)`;
      summaryList.appendChild(extra);
    }
  }

  productsWrapper.appendChild(summaryList);

  const footer = document.createElement("footer");
  footer.className = "order-card__footer";

  const totalLabel = document.createElement("span");
  totalLabel.className = "order-card__total-label";
  totalLabel.textContent = "Total";

  const totalValue = document.createElement("span");
  totalValue.className = "order-card__total-value";
  totalValue.textContent = formatCurrency(order.total);

  footer.append(totalLabel, totalValue);

  card.append(header, date, productsWrapper, footer);

  card.addEventListener("click", () => openModal(order));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openModal(order);
    }
  });

  return card;
};

const createProductsSection = (order: ClientOrder): HTMLElement => {
  const section = document.createElement("section");
  section.className = "order-modal__section";

  const heading = document.createElement("h3");
  heading.textContent = "Productos";

  const list = document.createElement("ul");
  list.className = "order-modal__products";

  if (order.products.length === 0) {
    const item = document.createElement("li");
    item.className = "order-modal__products-empty";
    item.textContent = "No hay productos asociados al pedido.";
    list.appendChild(item);
  } else {
    order.products.forEach((product) => {
      const item = document.createElement("li");
      item.className = "order-modal__product";

      const info = document.createElement("div");
      info.className = "order-modal__product-info";

      const name = document.createElement("span");
      name.className = "order-modal__product-name";
      name.textContent = product.name;

      const quantity = document.createElement("span");
      quantity.className = "order-modal__product-quantity";
      quantity.textContent = `${product.quantity} × ${formatCurrency(product.price)}`;

      info.append(name, quantity);

      const total = document.createElement("span");
      total.className = "order-modal__product-total";
      total.textContent = formatCurrency(product.price * product.quantity);

      item.append(info, total);
      list.appendChild(item);
    });
  }

  section.append(heading, list);
  return section;
};

const createCostsSection = (order: ClientOrder): HTMLElement => {
  const section = document.createElement("section");
  section.className = "order-modal__section";

  const heading = document.createElement("h3");
  heading.textContent = "Resumen de costos";

  const list = document.createElement("dl");
  list.className = "order-modal__costs";

  const addRow = (label: string, value: string, isTotal = false) => {
    const term = document.createElement("dt");
    term.textContent = label;
    const definition = document.createElement("dd");
    definition.textContent = value;
    if (isTotal) {
      term.classList.add("order-modal__costs-total");
      definition.classList.add("order-modal__costs-total");
    }
    list.append(term, definition);
  };

  addRow("Subtotal", formatCurrency(order.subtotal));
  addRow("Envío", formatCurrency(order.shipping));
  if (order.discount > 0) {
    addRow("Descuentos", `- ${formatCurrency(order.discount)}`);
  }
  addRow("Total", formatCurrency(order.total), true);

  section.append(heading, list);
  return section;
};

const createDeliverySection = (delivery: OrderDeliveryInfo | undefined): HTMLElement => {
  const section = document.createElement("section");
  section.className = "order-modal__section";

  const heading = document.createElement("h3");
  heading.textContent = "Información de entrega";

  const details = document.createElement("div");
  details.className = "order-modal__delivery-details";

  if (!delivery) {
    const note = document.createElement("p");
    note.className = "order-modal__delivery-note";
    note.textContent = "No se registró información de entrega para este pedido.";
    details.appendChild(note);
  } else {
    const addDetail = (label: string, value: string | undefined) => {
      if (!value) {
        return;
      }
      const paragraph = document.createElement("p");
      paragraph.className = "order-modal__delivery-note";
      const strong = document.createElement("strong");
      strong.textContent = `${label}:`;
      paragraph.append(strong, document.createTextNode(" "), document.createTextNode(value));
      details.appendChild(paragraph);
    };

    addDetail("Método", delivery.method);
    addDetail("Dirección", delivery.address);
    addDetail("Referencia", delivery.reference);
    addDetail("Contacto", delivery.contactName);
    addDetail("Teléfono", delivery.contactPhone);
    addDetail("Programado", formatDateLong(delivery.scheduledAt));
    addDetail("Notas", delivery.notes);

    if (!details.childElementCount) {
      const note = document.createElement("p");
      note.className = "order-modal__delivery-note";
      note.textContent = "La entrega se coordinará directamente con el equipo de logística.";
      details.appendChild(note);
    }
  }

  section.append(heading, details);
  return section;
};

const renderOrders = () => {
  ordersListElement.replaceChildren();

  if (state.isLoading) {
    setBusy(true);
    ordersListElement.appendChild(createLoadingElement());
    return;
  }

  setBusy(false);

  if (state.error) {
    ordersListElement.appendChild(createErrorElement(state.error));
    return;
  }

  if (!state.orders.length) {
    ordersListElement.appendChild(createEmptyStateElement());
    return;
  }

  const fragment = document.createDocumentFragment();
  state.orders.forEach((order) => {
    fragment.appendChild(createOrderCard(order));
  });
  ordersListElement.appendChild(fragment);
};

const renderModalContent = (order: ClientOrder) => {
  const fragment = document.createDocumentFragment();

  const header = document.createElement("header");
  header.className = "order-modal__header";

  const title = document.createElement("h2");
  title.className = "order-modal__title";
  title.id = "order-modal-title";
  title.textContent = `Pedido #${order.number}`;

  const meta = document.createElement("div");
  meta.className = "order-modal__meta";

  const statusBadge = createStatusBadge(order.status);
  statusBadge.classList.add("order-modal__status");

  const date = document.createElement("time");
  date.className = "order-modal__date";
  date.dateTime = order.createdAt;
  date.textContent = formatDateLong(order.createdAt) ?? formatDate(order.createdAt);

  meta.append(statusBadge, date);
  header.append(title, meta);

  const message = document.createElement("p");
  message.className = "order-modal__message";
  message.textContent = order.message ?? STATUS_CONFIG[order.status].message;

  fragment.append(header, message, createProductsSection(order), createCostsSection(order), createDeliverySection(order.delivery));

  modalContentElement.replaceChildren(fragment);
};

const openModal = (order: ClientOrder) => {
  state.selectedOrder = order;
  renderModalContent(order);
  modalElement.classList.add("is-open");
  modalElement.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const closeButton = modalElement.querySelector<HTMLButtonElement>(".order-modal__close");
  closeButton?.focus();
};

const closeModal = () => {
  state.selectedOrder = null;
  modalElement.classList.remove("is-open");
  modalElement.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

closeTriggers.forEach((trigger) => {
  trigger.addEventListener("click", closeModal);
});

modalDialogElement.addEventListener("click", (event) => {
  event.stopPropagation();
});

modalElement.addEventListener("click", (event) => {
  if (event.target === modalElement) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modalElement.classList.contains("is-open")) {
    closeModal();
  }
});

const fetchOrders = async () => {
  const user = getCurrentUser();

  if (!ORDERS_API_URL) {
    state.error = "No se configuró la URL de pedidos. Revisá el archivo .env.";
    state.orders = [];
    state.isLoading = false;
    renderOrders();
    return;
  }

  if (!user) {
    state.error = "Necesitás iniciar sesión para ver tus pedidos.";
    state.orders = [];
    state.isLoading = false;
    renderOrders();
    return;
  }

  state.isLoading = true;
  state.error = null;
  renderOrders();

  const endpoint = buildOrdersUrl(ORDERS_API_URL, user.id);

  const { data, error } = await Get<unknown>(endpoint);

  state.isLoading = false;

  if (error || !data) {
    state.error = error?.mensaje ?? "No se pudieron obtener los pedidos. Intentá nuevamente.";
    state.orders = [];
    renderOrders();
    return;
  }

  const orders = adaptOrders(data);
  state.orders = orders;
  state.error = null;
  renderOrders();
};

const init = () => {
  checkAuthUsers("CLIENTE", "/src/pages/admin/home/home.html");
  renderOrders();
  void fetchOrders();
};

init();
