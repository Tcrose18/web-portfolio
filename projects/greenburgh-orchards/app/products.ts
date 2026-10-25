export type Product = {
  id: string;
  name: string;
  edition: string;
  price: number;
  image: string;
  alt: string;
  description: string;
  details: string[];
  sizes: string[];
  category?: "Tees" | "Sweatshirts";
  preview?: boolean;
};

// Add pieces here: the collection, search, product viewer, and bag update automatically.
// Set preview: true for unreleased designs; set a price and sizes before enabling orders.
export const products: Product[] = [
  {
    id: "verger-neigeux-tee",
    name: "Verger Neigeux Tee",
    edition: "Edition 001 / Natural",
    price: 110,
    image: "/designs/verger-tee.jpg",
    category: "Tees",
    alt: "Natural cotton Greenburgh Orchards T-shirt with a small sheep illustration",
    description:
      "A quiet study of pasture, shadow, and the animals that shape the orchard. Printed in a softened black on an undyed cotton jersey.",
    details: [
      "Midweight 100% cotton jersey",
      "Water-based screen print",
      "Cut and sewn in small quantities",
      "Relaxed, unisex fit",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "vineyard-wrestling-tee", name: "Vineyard Wrestling Tee", edition: "Design study / Washed plum", price: 0,
    image: "/designs/vineyard-wrestling.jpg", alt: "Plum Vineyard Wrestling Classic shirt hanging beside a woodpile in the garden",
    description: "Wrestling in the vineyard. An illustrated study of sport, harvest, and afternoons outdoors.",
    details: ["Vineyard Wrestling Classic artwork", "Washed plum color study", "Design preview — release details to follow"], sizes: [], category: "Tees", preview: true,
  },
  {
    id: "pasture-tee", name: "Pasture Study Tee", edition: "Design study / Oatmeal", price: 0,
    image: "/designs/pasture-tee.jpg", alt: "Oatmeal T-shirt with an overlapping ochre cattle illustration",
    description: "A moving arrangement of cattle, rendered in warm earth tones. An orchard study in line and color.",
    details: ["Layered cattle illustration", "Oatmeal color study", "Design preview — release details to follow"], sizes: [], category: "Tees", preview: true,
  },
  {
    id: "orchard-sweatshirt", name: "Orchard Embroidered Sweatshirt", edition: "Design study / Ochre", price: 0,
    image: "/designs/ochre-sweatshirt.jpg", alt: "Ochre sweatshirt with a hand-worked oval and small botanical embroidery",
    description: "A small embroidered gesture on sun-washed ochre. A study in texture, fading, and the details we keep.",
    details: ["Botanical embroidery study", "Ochre color study", "Design preview — release details to follow"], sizes: [], category: "Sweatshirts", preview: true,
  },
];
