export interface Design {
  id: string;
  name: string;
  category: string;
  price: string;
  fabric: string;
  description: string;
  tags: string[];
  images: string[];
  featured: boolean;
  available: boolean;
  color: string;
}

export type Category = "All" | "Lehenga" | "Anarkali" | "Saree" | "Gown" | "Sharara" | "Kurti";
