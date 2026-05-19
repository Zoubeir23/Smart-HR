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
          "bg-[hsl(160,84%,28%,0.12)] text-[hsl(160,84%,24%)] border-[hsl(160,84%,28%,0.20)] dark:bg-[hsl(160,60%,42%,0.18)] dark:text-[hsl(160,60%,68%)] dark:border-[hsl(160,60%,42%,0.28)]",
        /* En attente — orange teinté */
        pending:
          "bg-[hsl(25,95%,53%,0.12)] text-[hsl(25,95%,36%)] border-[hsl(25,95%,53%,0.20)] dark:bg-[hsl(25,90%,55%,0.18)] dark:text-[hsl(25,90%,72%)] dark:border-[hsl(25,90%,55%,0.28)]",
        /* Inactif / rejeté — rouge teinté */
        inactive:
          "bg-[hsl(0,69%,50%,0.12)] text-[#c41e1e] border-[hsl(0,69%,50%,0.20)] dark:bg-[hsl(0,68%,55%,0.18)] dark:text-[hsl(0,68%,72%)] dark:border-[hsl(0,68%,55%,0.28)]",
        /* Compteur — fond muted adaptatif */
        count:
          "bg-muted text-foreground border-border tabular-nums min-w-[22px] justify-center",
        /* Outline neutre */
        outline:
          "bg-card text-muted-foreground border-border",
        /* Default — rouge plein */
        default:
          "bg-[#D62828] text-white border-[#D62828]",
        /* Secondary — muted adaptatif */
        secondary:
          "bg-muted text-foreground border-transparent dark:bg-muted dark:text-foreground",
        /* Destructive */
        destructive:
          "bg-[#D62828] text-white border-transparent",
        /* Warning — orange adaptatif */
        warning:
          "bg-[hsl(25,95%,53%,0.12)] text-[hsl(25,95%,36%)] border-[hsl(25,95%,53%,0.20)] dark:bg-[hsl(25,90%,55%,0.18)] dark:text-[hsl(25,90%,72%)] dark:border-[hsl(25,90%,55%,0.28)]",
        /* Success — vert adaptatif */
        success:
          "bg-[hsl(160,84%,28%,0.12)] text-[hsl(160,84%,24%)] border-[hsl(160,84%,28%,0.20)] dark:bg-[hsl(160,60%,42%,0.18)] dark:text-[hsl(160,60%,68%)] dark:border-[hsl(160,60%,42%,0.28)]",
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
