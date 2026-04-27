import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        /* Actif — vert teinté */
        active:
          "bg-[hsl(160,84%,28%,0.10)] text-[hsl(160,84%,24%)] border-[hsl(160,84%,28%,0.18)]",
        /* En attente — orange teinté */
        pending:
          "bg-[hsl(25,95%,53%,0.10)] text-[hsl(25,95%,36%)] border-[hsl(25,95%,53%,0.18)]",
        /* Inactif / rejeté — rouge teinté */
        inactive:
          "bg-[hsl(0,69%,50%,0.10)] text-[#c41e1e] border-[hsl(0,69%,50%,0.18)]",
        /* Compteur — fond cream muted */
        count:
          "bg-[hsl(36,40%,91%)] text-foreground border-[hsl(34,30%,86%)] tabular-nums min-w-[22px] justify-center",
        /* Outline neutre */
        outline:
          "bg-card text-muted-foreground border-[hsl(34,30%,86%)] dark:border-[hsl(20,10%,22%)]",
        /* Default — rouge plein (badge count rouge, IA badge) */
        default:
          "bg-[#D62828] text-white border-[#D62828]",
        /* Secondary */
        secondary:
          "bg-[hsl(36,40%,91%)] text-foreground border-transparent",
        /* Destructive */
        destructive:
          "bg-[#D62828] text-white border-transparent",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
