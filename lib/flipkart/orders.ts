import { flipkartClient } from "./client";

export interface OrderItem {
  orderId: string;
  orderItemId: string;
  sku: string;
  quantity: number;
  price: number;
  status: string;
  orderDate: string;
}

/**
 * Retrieves orders from Flipkart Seller Orders API v2
 * Note: Flipkart requires active seller tier and specific OAuth scope 'orders_r'
 */
export async function getFlipkartOrders(): Promise<{ orders: OrderItem[]; message: string; isSupported: boolean }> {
  try {
    const isDry = await flipkartClient.isDryRun();
    if (isDry) {
      return {
        orders: [],
        message: "Orders sync requires live seller approval and API credentials in production mode.",
        isSupported: false,
      };
    }

    const res = await flipkartClient.request<{ orderItems?: any[] }>({
      method: "GET",
      endpoint: "/v2/orders/search",
      params: {
        status: "APPROVED",
      },
      operationName: "SYNC_STATUS",
      timeoutMs: 10000,
      maxRetries: 1,
    });

    const items: OrderItem[] = (res.data?.orderItems || []).map((item: any) => ({
      orderId: item.orderId,
      orderItemId: item.orderItemId,
      sku: item.sku,
      quantity: item.quantity,
      price: item.priceComponents?.sellingPrice || 0,
      status: item.status,
      orderDate: item.orderDate,
    }));

    return {
      orders: items,
      message: `Retrieved ${items.length} orders from Flipkart.`,
      isSupported: true,
    };
  } catch (error: any) {
    return {
      orders: [],
      message: `Orders API not available for current seller scope (${error.userMessage || error.message})`,
      isSupported: false,
    };
  }
}
