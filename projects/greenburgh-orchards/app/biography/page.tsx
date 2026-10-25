import type { Metadata } from "next";
import Storefront from "../Storefront";
export const metadata: Metadata = { title: "Biography — Greenburgh Orchards" };
export default function BiographyPage() { return <Storefront page="biography" />; }
