export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface OrderDeliveryInfo {
  method?: string;
  address?: string;
  reference?: string;
  contactName?: string;
  contactPhone?: string;
  notes?: string;
  scheduledAt?: string;
}

export interface ClientOrder {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  products: OrderProduct[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  delivery?: OrderDeliveryInfo;
  message?: string;
}
