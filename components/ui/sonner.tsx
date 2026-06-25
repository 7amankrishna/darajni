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
            "group toast border border-white/10 bg-[#11110f] text-white shadow-2xl",
          description: "text-white/50",
          actionButton: "bg-[#caaa70] text-black",
          cancelButton: "bg-white/10 text-white",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
