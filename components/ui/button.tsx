import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#caaa70]",
  {
    variants: {
      variant: {
        default:
          "border border-[#caaa70] bg-[#caaa70] text-[#151006] hover:bg-[#d8bd87]",
        destructive:
          "border border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20",
        outline:
          "border border-[#caaa70]/50 bg-transparent text-[#e4c58c] hover:bg-[#caaa70]/10",
        secondary:
          "border border-white/10 bg-white/5 text-white hover:bg-white/10",
        ghost: "text-white/70 hover:bg-white/5 hover:text-white",
        link: "rounded-none text-[#e4c58c] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-7",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
