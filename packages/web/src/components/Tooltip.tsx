import { useState } from "react";
import { useTooltips } from "../hooks/useTooltips";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
  wrapperClass?: string;
}

export function Tooltip({
  text,
  children,
  position = "top",
  wrapperClass = "relative inline-flex",
}: TooltipProps) {
  const { enabled } = useTooltips();
  const [visible, setVisible] = useState(false);

  if (!enabled) return <>{children}</>;

  const posClass =
    position === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-1.5"
      : "top-full left-1/2 -translate-x-1/2 mt-1.5";

  return (
    <div
      className={wrapperClass}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute ${posClass} z-[200] px-2 py-1 text-xs bg-gray-900 text-gray-100 border border-gray-700 rounded shadow-lg whitespace-nowrap pointer-events-none`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
