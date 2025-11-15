export type NotificationVariant = "success" | "error" | "info"

export interface NotificationController {
  reset: () => void
  show: (message: string, variant: NotificationVariant) => void
}

const notificationVariants: NotificationVariant[] = ["success", "error", "info"]

const getVariantClasses = () => notificationVariants.map((variant) => `notification--${variant}`)

export const createNotificationController = (element: HTMLElement): NotificationController => {
  const reset = () => {
    element.textContent = ""
    element.classList.remove("notification--visible", ...getVariantClasses())
  }

  const show = (message: string, variant: NotificationVariant) => {
    element.textContent = message
    element.classList.remove(...getVariantClasses())
    element.classList.add("notification--visible", `notification--${variant}`)
  }

  return { reset, show }
}
