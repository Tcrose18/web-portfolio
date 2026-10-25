import type { Metadata } from "next";
import Storefront from "../Storefront";
export const metadata: Metadata = { title: "Design Studies — Greenburgh Orchards" };
export default function StudiesPage() { return <Storefront page="studies" />; }
