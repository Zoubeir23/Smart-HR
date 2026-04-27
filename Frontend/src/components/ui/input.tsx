import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          /* DS spec: h-44px, border-radius 10px, bg blanc, focus rouge */
          "flex h-11 w-full rounded-[10px] border border-[hsl(34,30%,86%)] bg-card px-3 py-2 text-sm font-medium text-foreground dark:border-[hsl(20,10%,22%)]",
          "placeholder:text-muted-foreground placeholder:font-normal",
          "transition-[border-color,box-shadow] duration-150",
          "focus-visible:outline-none focus-visible:border-[#D62828] focus-visible:shadow-[0_0_0_3px_hsl(0,69%,50%,0.08)]",
          "disabled:cursor-not-allowed disabled:bg-[hsl(36,40%,91%)] disabled:text-muted-foreground disabled:opacity-100",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
