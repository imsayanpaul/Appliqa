import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn",
  {
    variants: {
      variant: {
        default: "btn-primary",
        primary: "btn-primary",
        destructive: "bg-red-500 text-white hover:bg-red-600 border-none",
        outline: "btn-secondary",
        secondary: "btn-secondary",
        ghost: "btn-ghost",
        link: "text-orange-500 underline-offset-4 hover:underline bg-transparent border-none",
      },
      size: {
        default: "",
        sm: "btn-sm",
        lg: "btn-lg",
        icon: "btn-icon",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
