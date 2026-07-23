import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ size = 40, showText = true, className }: { size?: number; showText?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 select-none", className)}>
      <img
        src="/logo.png"
        alt="揪好咖 JoinJoy"
        width={size}
        height={size}
        className="rounded-[22%] shadow-sm object-contain"
        style={{ width: size, height: size, objectFit: "contain" }}
      />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-bold text-main">揪好咖</span>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-soft">JOINJOY</span>
        </span>
      )}
    </Link>
  );
}
