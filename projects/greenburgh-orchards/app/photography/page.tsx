import type { Metadata } from "next";
import Storefront from "../Storefront";
import Photography from "./Photography";

export const metadata: Metadata = {
  title: "Photography — Greenburgh Orchards",
  description: "Photographs gathered by Greenburgh Orchards, in black and white and in color.",
};

export default function PhotographyPage() {
  return <Storefront page="photography"><Photography /></Storefront>;
}
