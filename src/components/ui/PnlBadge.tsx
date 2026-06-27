import { clsx } from "clsx";

interface PnlBadgeProps {
  value: number;
  showSign?: boolean;
  className?: string;
}

export default function PnlBadge({ value, showSign = true, className }: PnlBadgeProps) {
  const positive = value >= 0;
  return (
    <span
      className={clsx(
        "font-semibold",
        positive ? "text-[var(--green)]" : "text-[var(--red)]",
        className
      )}
    >
      {showSign && (positive ? "+" : "")}
      {value >= 0 ? "$" : "-$"}
      {Math.abs(value).toLocaleString()}
    </span>
  );
}
