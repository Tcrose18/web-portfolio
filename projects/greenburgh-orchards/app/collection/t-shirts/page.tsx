import type { Metadata } from "next";
import Storefront from "../../Storefront";
export const metadata: Metadata = { title: "T-shirts — Greenburgh Orchards" };
export default function TeesPage() { return <Storefront page="collection" initialCategory="Tees" />; }
