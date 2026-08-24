import type { ReactNode } from "react";
import { toast } from "sonner";

/**
 * Discourages casual bulk copying of registry listings without hiding any
 * content from crawlers: the markup is fully rendered server-side and stays
 * readable to Googlebot, Bingbot and AI crawlers. Only interactive
 * select/copy/right-click gestures are intercepted in the browser.
 */
export function CopyGuard({ children, className }: { children: ReactNode; className?: string }) {
  const notify = () =>
    toast("Listing data is protected", {
      description: "Bulk copying of the register index is not permitted. Order a report for verified data.",
    });

  return (
    <div
      className={className}
      data-copy-guard="true"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      onCopy={(e) => {
        e.preventDefault();
        notify();
      }}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => {
        e.preventDefault();
        notify();
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
