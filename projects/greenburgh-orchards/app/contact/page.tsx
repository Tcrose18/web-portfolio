import type { Metadata } from "next";
import Storefront from "../Storefront";
export const metadata: Metadata = { title: "Inquiries — Greenburgh Orchards" };
export default function ContactPage() { return <Storefront page="contact" />; }
