import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white shadow-sm transition outline-none placeholder:text-white/70 focus-visible:border-[#caaa70]/75 focus-visible:ring-2 focus-visible:ring-[#caaa70]/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
