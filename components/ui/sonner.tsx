"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-[#E9DCCB] bg-[#FFFDF8] text-[#171717] shadow-2xl",
          description: "text-[#6F6255]",
          actionButton: "bg-[#111111] text-white",
          cancelButton: "bg-[#F6E9DD] text-[#171717]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
