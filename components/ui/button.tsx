import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8893B]",
  {
    variants: {
      variant: {
        default:
          "border border-[#111111] bg-[#111111] text-white hover:bg-[#6E0F1A]",
        destructive:
          "border border-red-500/40 bg-red-500/10 text-red-800 hover:bg-red-500/20",
        outline:
          "border border-[#B8893B]/55 bg-transparent text-[#171717] hover:bg-[#F6E9DD]",
        secondary:
          "border border-[#E9DCCB] bg-[#FFFDF8] text-[#171717] hover:bg-[#F6E9DD]",
        ghost: "text-[#6F6255] hover:bg-[#F6E9DD] hover:text-[#171717]",
        link: "rounded-none text-[#6E0F1A] underline-offset-4 hover:underline",
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
