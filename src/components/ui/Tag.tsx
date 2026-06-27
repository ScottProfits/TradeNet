import { clsx } from "clsx";

const tagColors: Record<string, string> = {
  Hot: "bg-orange-500/20 text-orange-400",
  Cold: "bg-blue-500/20 text-blue-400",
  Rising: "bg-green-500/20 text-green-400",
};

export default function Tag({ label }: { label: string }) {
  return (
    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", tagColors[label] ?? "bg-gray-700 text-gray-300")}>
      {label}
    </span>
  );
}
