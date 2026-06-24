import { Design } from "../types";

export const designs: Design[] = [
  {
    id: "seed-crimson-royale",
    slug: "crimson-royale-lehenga",
    name: "Crimson Royale Lehenga",
    category: "Lehenga",
    price: 18500,
    fabric: "Silk blend with zari work",
    description:
      "A rich crimson occasion lehenga finished with intricate zari-inspired detailing, a generous flare and a coordinated dupatta. Custom measurements are available before production.",
    tags: ["Bridal", "Wedding", "Festive"],
    images: [
      "https://images.pexels.com/photos/37628619/pexels-photo-37628619.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      "https://images.pexels.com/photos/33101418/pexels-photo-33101418.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    ],
    featured: true,
    available: true,
    color: "#8B1A1A",
  },
  {
    id: "seed-rose-petal",
    slug: "rose-petal-lehenga",
    name: "Rose Petal Lehenga",
    category: "Lehenga",
    price: 14200,
    fabric: "Georgette and raw silk",
    description:
      "A soft rose-pink lehenga with floral thread work, a coordinated blouse and a light sequin-detailed dupatta for mehendi, engagement and festive celebrations.",
    tags: ["Mehendi", "Pastel", "Floral"],
    images: [
      "https://images.pexels.com/photos/37628608/pexels-photo-37628608.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      "https://images.pexels.com/photos/37396069/pexels-photo-37396069.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    ],
    featured: true,
    available: true,
    color: "#E8A0B4",
  },
  {
    id: "seed-midnight-zari",
    slug: "midnight-zari-gown",
    name: "Midnight Zari Gown",
    category: "Gown",
    price: 22000,
    fabric: "Velvet and net",
    description:
      "A midnight-blue floor-length gown with gold detailing, a structured bodice and a fluid silhouette designed for receptions and evening celebrations.",
    tags: ["Reception", "Cocktail", "Evening"],
    images: [
      "https://images.pexels.com/photos/17559250/pexels-photo-17559250.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      "https://images.pexels.com/photos/34326848/pexels-photo-34326848.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    ],
    featured: true,
    available: true,
    color: "#1A1A5E",
  },
  {
    id: "seed-emerald-anarkali",
    slug: "emerald-anarkali",
    name: "Emerald Anarkali",
    category: "Anarkali",
    price: 9500,
    fabric: "Chanderi silk blend",
    description:
      "An emerald Anarkali with delicate embroidery, a floor-length silhouette and a printed dupatta for festive gatherings and family celebrations.",
    tags: ["Festive", "Eid", "Embroidered"],
    images: [
      "https://images.pexels.com/photos/6236647/pexels-photo-6236647.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      "https://images.pexels.com/photos/6234216/pexels-photo-6234216.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    ],
    featured: false,
    available: true,
    color: "#1B5E20",
  },
  {
    id: "seed-golden-sharara",
    slug: "golden-sharara-set",
    name: "Golden Sharara Set",
    category: "Sharara",
    price: 12000,
    fabric: "Banarasi brocade",
    description:
      "A woven sharara set with a short kurta, wide-legged flare and sheer dupatta. Designed as a versatile statement piece for wedding festivities.",
    tags: ["Wedding Guest", "Banarasi", "Festive"],
    images: [
      "https://images.pexels.com/photos/19588667/pexels-photo-19588667.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      "https://images.pexels.com/photos/37396069/pexels-photo-37396069.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    ],
    featured: true,
    available: true,
    color: "#B8860B",
  },
  {
    id: "seed-mauve-organza",
    slug: "mauve-organza-saree",
    name: "Mauve Organza Saree",
    category: "Saree",
    price: 7800,
    fabric: "Organza with hand-finished embroidery",
    description:
      "A lightweight mauve organza saree with a floral border and coordinated blouse fabric, suited to sangeet, reception and intimate celebrations.",
    tags: ["Saree", "Sangeet", "Lightweight"],
    images: [
      "https://images.pexels.com/photos/12791932/pexels-photo-12791932.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      "https://images.pexels.com/photos/34326848/pexels-photo-34326848.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    ],
    featured: false,
    available: true,
    color: "#C9A0B0",
  },
];

export const categories = [
  "All",
  "Lehenga",
  "Anarkali",
  "Saree",
  "Gown",
  "Sharara",
  "Kurti",
];
