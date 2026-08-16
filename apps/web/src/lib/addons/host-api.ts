import type { HostApi, HostOrderWithItems } from "@finopenpos/addon-kit";
import { loadOrder, productMap } from "@/lib/es";

/**
 * Implementação da Host API v1 — a superfície estável que o core expõe para
 * addons lerem os domínios operacionais (event-sourced). Addons nunca
 * importam internals do host; só enxergam este contrato via ctx.api.
 */
export const hostApi: HostApi = {
	async loadOrderWithItems(
		orderId: number,
		userUid: string,
	): Promise<HostOrderWithItems | undefined> {
		const { state } = await loadOrder(orderId);
		if (!state || state.user_uid !== userUid) return undefined;

		const products = await productMap(userUid);
		const { items, ...order } = state;
		return {
			...order,
			orderItems: items.map((item, idx) => ({
				id: state.id * 1000 + idx + 1,
				order_id: state.id,
				product_id: item.product_id,
				quantity: item.quantity,
				price: item.price,
				product: products.get(item.product_id) ?? null,
			})),
		};
	},
};
