import { describe, expect, it } from "vitest";
import { analyticsPagePath } from "@/lib/analytics";
import { curatedProducts } from "@/lib/storefront";
import type { Product } from "@/types/commerce";

describe("public analytics paths", () => {
  it("strips query strings and fragments", () => {
    expect(analyticsPagePath("/collection?email=private@example.com#token")).toBe("/collection");
    expect(analyticsPagePath("/design/red-white-embroidered-salwar-suit-set")).toBe("/design/red-white-embroidered-salwar-suit-set");
  });
  it.each(["/admin", "/admin/orders/123", "/order/success?token=secret", "/checkout", "/dashboard", "/reset-password", "/track", "/api/checkout"])("excludes %s", (path) => {
    expect(analyticsPagePath(path)).toBeNull();
  });
});

describe("editorial product selection", () => {
  const product = (slug: string, isActive = true) => ({ id: slug, slug, isActive } as Product);
  it("keeps real products, excludes inactive designs, and prioritises the requested edit", () => {
    const products = [
      product("another-design"),
      product("maroon-velvet-designer-lehenga-set", false),
      product("red-white-embroidered-salwar-suit-set"),
    ];
    expect(curatedProducts(products)).toEqual([products[2], products[0]]);
    expect(products[0].slug).toBe("another-design");
  });
  it("does not invent missing products or duplicate selected products", () => {
    expect(curatedProducts([])).toEqual([]);
    const products = [product("maroon-velvet-designer-lehenga-set")];
    expect(curatedProducts(products)).toEqual(products);
  });
});
