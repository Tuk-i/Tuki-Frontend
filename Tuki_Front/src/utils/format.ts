const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat("es-AR")

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
})

const dateTimeLongFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
})

const buildFormatter = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat("es-AR", options)

const ensureDate = (value: string | number | Date): Date | undefined => {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : undefined
}

export const formatCurrency = (value: number): string => {
  const normalized = Number.isFinite(value) ? value : 0
  const rounded = Math.round(normalized * 100) / 100
  return currencyFormatter.format(rounded)
}

export const formatNumber = (value: number): string => numberFormatter.format(Number.isFinite(value) ? value : 0)

export const formatDate = (value: string | number | Date, options?: Intl.DateTimeFormatOptions): string => {
  const date = ensureDate(value)
  if (!date) {
    return ""
  }

  if (!options) {
    return dateTimeFormatter.format(date)
  }

  return buildFormatter(options).format(date)
}

export const formatDateLong = (
  value: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  const date = ensureDate(value)
  if (!date) {
    return undefined
  }

  if (!options) {
    return dateTimeLongFormatter.format(date)
  }

  return buildFormatter(options).format(date)
}
