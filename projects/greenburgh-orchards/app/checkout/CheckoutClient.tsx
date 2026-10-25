"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { products, type Product } from "../products";

type CheckoutItem = { product: Product; size: string; quantity: number };

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function CheckoutClient() {
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const selections = new URLSearchParams(window.location.search).getAll("item");
    const parsed = selections.flatMap((selection) => {
      const splitAt = selection.lastIndexOf(".");
      const productId = selection.slice(0, splitAt);
      const size = selection.slice(splitAt + 1);
      const product = products.find((candidate) => candidate.id === productId);
      return product && !product.preview && product.sizes.includes(size) ? [{ product, size, quantity: 1 }] : [];
    });
    setItems(parsed);
    setLoaded(true);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  );

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) {
      setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
      return;
    }
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity } : item));
  };

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus("submitting");
    setError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          fullName: formData.get("fullName"),
          address: formData.get("address"),
          city: formData.get("city"),
          region: formData.get("region"),
          postalCode: formData.get("postalCode"),
          country: formData.get("country"),
          items: items.map((item) => ({ productId: item.product.id, size: item.size, quantity: item.quantity })),
        }),
      });
      const result = await response.json() as { orderId?: string; error?: string };
      if (!response.ok || !result.orderId) throw new Error(result.error ?? "Unable to place order.");
      setOrderId(result.orderId);
      setStatus("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to place order.");
      setStatus("error");
    }
  };

  if (!loaded) return <main className="checkout-page checkout-loading">Preparing your bag…</main>;

  if (status === "success") {
    return (
      <main className="checkout-page checkout-success">
        <a className="checkout-wordmark" href="/">Greenburgh<br />Orchards</a>
        <div>
          <p className="section-index">Order received / {orderId}</p>
          <h1>Thank you.<br />Your piece is reserved.</h1>
          <p>We’ve recorded your order. Payment is not collected yet; Greenburgh Orchards will contact you with the secure payment step.</p>
          <a className="underlined-link" href="/">Return to the orchard <span>↗</span></a>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <a href="/" className="checkout-wordmark">Greenburgh<br />Orchards</a>
        <a href="/collection">Continue shopping</a>
      </header>

      <div className="checkout-grid">
        <section className="checkout-form-wrap" aria-labelledby="checkout-title">
          <p className="section-index">Secure checkout</p>
          <h1 id="checkout-title">Where should<br />we send it?</h1>

          {items.length ? (
            <form className="checkout-form" onSubmit={placeOrder}>
              <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
              <label>Full name<input name="fullName" autoComplete="name" required /></label>
              <label>Street address<input name="address" autoComplete="street-address" required /></label>
              <div className="checkout-fields-row">
                <label>City<input name="city" autoComplete="address-level2" required /></label>
                <label>State / region<input name="region" autoComplete="address-level1" required /></label>
              </div>
              <div className="checkout-fields-row">
                <label>Postal code<input name="postalCode" autoComplete="postal-code" required /></label>
                <label>Country<input name="country" autoComplete="country-name" defaultValue="United States" required /></label>
              </div>
              <div className="payment-note">
                <span>Payment</span>
                <p>Your order is reserved here. A secure payment link will follow once a payment provider is connected.</p>
              </div>
              {error && <p className="checkout-error" role="alert">{error}</p>}
              <button className="checkout-submit" type="submit" disabled={status === "submitting"}>
                <span>{status === "submitting" ? "Placing order…" : "Place order"}</span>
                <span>{money.format(subtotal)} ↗</span>
              </button>
            </form>
          ) : (
            <div className="checkout-empty">
              <p>Your bag is empty.</p>
              <a className="underlined-link" href="/collection">Return to the collection <span>↗</span></a>
            </div>
          )}
        </section>

        <aside className="checkout-summary" aria-label="Order summary">
          <div className="checkout-summary-top">
            <span>Order summary</span><span>{items.length} {items.length === 1 ? "piece" : "pieces"}</span>
          </div>
          <div className="checkout-items">
            {items.map((item, index) => (
              <article className="checkout-item" key={`${item.product.id}-${item.size}-${index}`}>
                <img src={item.product.image} alt="" />
                <div>
                  <h2>{item.product.name}</h2>
                  <p>{item.product.edition}<br />Size {item.size}</p>
                  <div className="quantity-control" aria-label={`Quantity for ${item.product.name}`}>
                    <button type="button" onClick={() => updateQuantity(index, item.quantity - 1)} aria-label="Decrease quantity">−</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(index, item.quantity + 1)} aria-label="Increase quantity">+</button>
                  </div>
                </div>
                <span>{money.format(item.product.price * item.quantity)}</span>
              </article>
            ))}
          </div>
          <dl className="checkout-totals">
            <div><dt>Subtotal</dt><dd>{money.format(subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>Complimentary</dd></div>
            <div className="checkout-total"><dt>Total</dt><dd>{money.format(subtotal)}</dd></div>
          </dl>
          <p className="checkout-assurance">Complimentary domestic shipping · Returns accepted within 14 days</p>
        </aside>
      </div>
    </main>
  );
}
