import Link from "next/link";

export const metadata = { title: "Order confirmation" };

export default function ShiprocketCheckoutCompletePage() {
  return (
    <main className="grid min-h-[65vh] place-items-center bg-background px-4 text-center">
      <div className="max-w-xl">
        <p className="eyebrow">Order received</p>
        <h1 className="font-display mt-3 text-5xl leading-none text-text-primary sm:text-6xl">
          We are confirming your order.
        </h1>
        <p className="mt-5 text-sm leading-7 text-text-secondary">
          Your Shiprocket Checkout details have been received. We will send your
          order confirmation and delivery updates to the phone number you used.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/track" className="primary-button">Track an order</Link>
          <Link href="/collection" className="secondary-button">Continue shopping</Link>
        </div>
      </div>
    </main>
  );
}
