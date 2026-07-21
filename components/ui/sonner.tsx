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
            "group toast border border-border bg-surface text-text-primary shadow-2xl",
          description: "text-text-secondary",
          actionButton: "bg-primary text-surface",
          cancelButton: "bg-surface-alt text-text-primary",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
