import type { Metadata } from "next";
import Storefront from "../../Storefront";
export const metadata: Metadata = { title: "Sweatshirts — Greenburgh Orchards" };
export default function SweatshirtsPage() { return <Storefront page="collection" initialCategory="Sweatshirts" />; }
