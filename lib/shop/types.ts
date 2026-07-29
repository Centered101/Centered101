// Row shape of the public.shop_products table.
export interface ShopProduct {
  id: string
  name: string
  name_th: string | null
  code: string
  description: string | null
  description_th: string | null
  price: number
  original_price: number | null
  category: string
  image_url: string | null
  badge: string | null
  in_stock: boolean
  rating: number | null
  reviews: number | null
  stripe_price_id: string | null
  created_at: string
  updated_at: string
}

// Row shape of the public.shop_orders table.
export interface ShopOrder {
  id: string
  user_id: string | null
  customer_name: string | null
  customer_email: string | null
  total: number
  currency: string
  status: 'pending' | 'paid' | 'cancelled'
  items: ShopOrderItem[]
  stripe_session_id: string | null
  created_at: string
}

export interface ShopOrderItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  code?: string
}
