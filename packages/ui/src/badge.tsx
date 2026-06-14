import type { HTMLAttributes } from "react";
import { cn } from "./lib/cn.js";

export type BadgeTone = "neutral" | "green" | "amber" | "red" | "blue";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  blue: "bg-sky-50 text-sky-700"
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", toneClass[tone], className)}
      {...props}
    />
  );
}
