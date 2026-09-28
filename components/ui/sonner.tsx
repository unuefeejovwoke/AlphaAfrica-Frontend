"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      richColors={false}
      closeButton
      expand={false}
      duration={4000}
      gap={12}
      toastOptions={{
        closeButtonAriaLabel: "Dismiss notification",
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans text-sm",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground rounded-lg text-xs font-semibold",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground rounded-lg text-xs",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
