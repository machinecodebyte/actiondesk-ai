import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./lib/cn.js";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";
