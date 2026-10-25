import type { Metadata } from "next";
import Storefront from "../Storefront";
export const metadata: Metadata = { title: "All Pieces — Greenburgh Orchards" };
export default function CollectionPage() { return <Storefront page="collection" />; }
