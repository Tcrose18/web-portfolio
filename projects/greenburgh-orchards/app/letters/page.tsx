import type { Metadata } from "next";
import Storefront from "../Storefront";
export const metadata: Metadata = { title: "Letters — Greenburgh Orchards" };
export default function LettersPage() { return <Storefront page="letters" />; }
