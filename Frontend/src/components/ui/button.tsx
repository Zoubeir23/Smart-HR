import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        /* Rouge gradient — action principale */
        default:
          "bg-gradient-to-br from-[#D62828] to-[#e63c3c] text-white shadow-sm hover:brightness-[1.08] hover:shadow-md",
        /* Cream — bouton secondaire sur fond clair */
        secondary:
          "bg-[#FFF3E0] text-[#c41e1e] border border-[hsl(34,30%,86%)] hover:bg-[#ffe0b2]",
        /* Outline — action tertiaire */
        outline:
          "border border-[hsl(34,30%,86%)] bg-card text-foreground hover:border-[hsl(0,69%,50%,0.30)] hover:bg-muted dark:border-[hsl(20,10%,22%)]",
        /* Ghost — action contextuelle, très discret */
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        /* Destructive — suppression / refus */
        destructive:
          "bg-[#D62828] text-white hover:bg-[#c41e1e]",
        /* Link */
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 rounded-[10px] px-4 py-2 text-sm [&_svg]:size-4",
        sm:      "h-8  rounded-[8px]  px-3 py-1 text-xs [&_svg]:size-3.5",
        lg:      "h-12 rounded-[12px] px-7 py-3 text-[15px] font-bold [&_svg]:size-4",
        icon:    "h-10 w-10 rounded-[10px] [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
