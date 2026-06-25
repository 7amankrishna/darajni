import Image from "next/image";

import { PrintButton } from "@/components/admin/print-button";
import { formatPrice } from "@/config/site";
import { formatDate } from "@/lib/commerce";
import type { AdminOrder } from "@/types/admin";

export function PrintDocument({
  order,
  type,
}: {
  order: AdminOrder;
  type: "invoice" | "packing-slip";
}) {
  const invoice = type === "invoice";

  return (
    <main className="print-page min-h-screen bg-white px-5 py-8 text-black sm:px-10">
      <div className="print:hidden mx-auto mb-5 flex max-w-[210mm] justify-end">
        <PrintButton />
      </div>
      <article className="mx-auto min-h-[270mm] max-w-[210mm] bg-white p-[12mm] shadow-2xl print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-black pb-6">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.webp"
              alt="DARAJNI logo"
              width={72}
              height={72}
              className="rounded-full border border-black/20"
            />
            <div>
              <p className="font-display text-3xl font-semibold tracking-wider">
                DARAJNI
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em]">
                Designer House
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold uppercase tracking-wider">
              {invoice ? "Invoice" : "Packing slip"}
            </h1>
            <p className="mt-2 text-sm font-semibold">{order.orderNumber}</p>
            <p className="mt-1 text-xs text-black/60">
              {formatDate(order.createdAt)}
            </p>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-8">
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/50">
              Ship to
            </p>
            <p className="mt-3 font-semibold">{order.customerName}</p>
            <p className="mt-2 text-sm leading-6">
              {order.address}
              <br />
              {order.city}, {order.state} {order.pincode}
              {order.landmark ? (
                <>
                  <br />
                  Landmark: {order.landmark}
                </>
              ) : null}
            </p>
          </section>
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/50">
              Contact
            </p>
            <p className="mt-3 text-sm">{order.phone}</p>
            {order.email && <p className="mt-2 text-sm">{order.email}</p>}
            <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-black/50">
              Payment
            </p>
            <p className="mt-2 text-sm capitalize">
              {order.paymentMethod === "cod" ? "Cash on delivery" : "Razorpay"} ·{" "}
              {order.paymentStatus}
            </p>
          </section>
        </div>

        <table className="mt-10 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-black">
              <th className="py-3 pr-4 text-xs uppercase tracking-wider">Item</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider">Size</th>
              <th className="px-4 py-3 text-center text-xs uppercase tracking-wider">
                Qty
              </th>
              {invoice && (
                <>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                    Price
                  </th>
                  <th className="py-3 pl-4 text-right text-xs uppercase tracking-wider">
                    Total
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-black/15">
                <td className="py-4 pr-4 font-medium">{item.productName}</td>
                <td className="px-4 py-4">{item.selectedSize}</td>
                <td className="px-4 py-4 text-center">{item.quantity}</td>
                {invoice && (
                  <>
                    <td className="px-4 py-4 text-right">
                      {formatPrice(item.priceAtTime)}
                    </td>
                    <td className="py-4 pl-4 text-right">
                      {formatPrice(item.lineTotal)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {invoice && (
          <div className="ml-auto mt-8 max-w-xs space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{formatPrice(order.shippingFee)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatPrice(order.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-black pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        )}

        <footer className="mt-16 border-t border-black/20 pt-5 text-xs text-black/55">
          <p>DARAJNI Designer House · Bihar Sharif, Bihar 803111 · India</p>
          <p className="mt-2">
            {invoice
              ? "Thank you for choosing DARAJNI."
              : "Packing slip intentionally excludes all pricing."}
          </p>
        </footer>
      </article>
    </main>
  );
}
