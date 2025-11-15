export const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return undefined
}

export const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const normalized = value.replace(/,/g, ".")
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export interface NormalizeBooleanOptions {
  truthyValues?: string[]
  falsyValues?: string[]
}

const defaultTruthy = new Set([
  "true",
  "1",
  "yes",
  "y",
  "si",
  "sí",
  "activo",
  "activa",
  "activos",
  "activas",
  "disponible",
  "disponibles",
  "habilitado",
  "habilitada",
  "habilitados",
  "habilitadas",
  "enabled",
  "available",
])

const defaultFalsy = new Set([
  "false",
  "0",
  "no",
  "inactive",
  "inactivo",
  "inactiva",
  "inactivos",
  "inactivas",
  "no disponible",
  "no disponibles",
  "deshabilitado",
  "deshabilitada",
  "deshabilitados",
  "deshabilitadas",
  "disabled",
  "eliminado",
  "eliminada",
  "eliminados",
  "eliminadas",
])

const buildSet = (base: Set<string>, additional?: string[]): Set<string> => {
  if (!additional?.length) {
    return base
  }

  const merged = new Set(base)
  for (const value of additional) {
    merged.add(value.trim().toLowerCase())
  }
  return merged
}

export const normalizeBoolean = (
  value: unknown,
  options?: NormalizeBooleanOptions,
): boolean | undefined => {
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
      return undefined
    }

    const truthy = buildSet(defaultTruthy, options?.truthyValues)
    if (truthy.has(normalized)) {
      return true
    }

    const falsy = buildSet(defaultFalsy, options?.falsyValues)
    if (falsy.has(normalized)) {
      return false
    }
  }

  return undefined
}

const stripAccents = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

export const normalizeStatusText = (value: string): string => stripAccents(value)

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

export interface UnwrapCollectionOptions {
  candidates?: string[]
  unwrapNestedObject?: boolean
  includeSourceObject?: boolean
}

const defaultCollectionCandidates = [
  "data",
  "items",
  "results",
  "content",
  "lista",
  "list",
  "values",
  "rows",
  "orders",
  "order",
  "pedidos",
  "pedido",
  "productos",
  "producto",
  "categories",
  "category",
]

export const unwrapCollection = <T = unknown>(
  value: unknown,
  options: UnwrapCollectionOptions = {},
): T[] => {
  if (Array.isArray(value)) {
    return value as T[]
  }

  if (isPlainObject(value)) {
    const { candidates = defaultCollectionCandidates, unwrapNestedObject = false, includeSourceObject = false } = options

    for (const key of candidates) {
      const candidate = value[key]
      if (Array.isArray(candidate)) {
        return candidate as T[]
      }

      if (unwrapNestedObject && isPlainObject(candidate)) {
        return [candidate as T]
      }
    }

    if (includeSourceObject) {
      return [value as T]
    }
  }

  return []
}
