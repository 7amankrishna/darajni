import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white shadow-sm transition outline-none placeholder:text-white/70 focus-visible:border-[#caaa70]/75 focus-visible:ring-2 focus-visible:ring-[#caaa70]/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
