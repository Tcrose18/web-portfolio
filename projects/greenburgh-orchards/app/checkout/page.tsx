import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout — Greenburgh Orchards",
  description: "Complete your Greenburgh Orchards order.",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
