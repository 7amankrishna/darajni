"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="primary-button print:hidden"
    >
      <Printer className="h-4 w-4" />
      Print
    </button>
  );
}
