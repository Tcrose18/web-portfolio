import { getDb } from "../../../db";
import { orders } from "../../../db/schema";
import { products } from "../../products";

type OrderItem = { productId?: string; size?: string; quantity?: number };

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: string;
      fullName?: string;
      address?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      items?: OrderItem[];
    };

    const required = [payload.email, payload.fullName, payload.address, payload.city, payload.region, payload.postalCode, payload.country];
    if (required.some((value) => !value?.trim())) {
      return Response.json({ error: "Complete all shipping fields." }, { status: 400 });
    }

    const normalizedItems = (payload.items ?? []).map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      const quantity = Math.max(1, Math.min(10, Math.floor(item.quantity ?? 1)));
      if (!product || product.preview || !item.size || !product.sizes.includes(item.size)) return null;
      return { productId: product.id, name: product.name, size: item.size, quantity, price: product.price };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    if (!normalizedItems.length) {
      return Response.json({ error: "Your bag is empty." }, { status: 400 });
    }

    const subtotalCents = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity * 100, 0);
    const orderId = `GO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    await getDb().insert(orders).values({
      id: orderId,
      email: payload.email!.trim().toLowerCase(),
      fullName: payload.fullName!.trim(),
      address: payload.address!.trim(),
      city: payload.city!.trim(),
      region: payload.region!.trim(),
      postalCode: payload.postalCode!.trim(),
      country: payload.country!.trim(),
      itemsJson: JSON.stringify(normalizedItems),
      subtotalCents,
    });

    return Response.json({ orderId, status: "awaiting_payment" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place order.";
    return Response.json({ error: message }, { status: 500 });
  }
}
