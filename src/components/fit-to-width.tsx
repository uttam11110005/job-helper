"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders fixed-width content (an A4 CV at 794px) scaled down to fit its
 * container, keeping the layout pixel-identical to the printed page.
 */
export function FitToWidth({ width = 794, children, className, crop, onHeight }: { width?: number; children: ReactNode; className?: string; crop?: boolean; onHeight?: (h: number) => void }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const s = Math.min(1, o.clientWidth / width);
      setScale(s);
      setHeight(i.offsetHeight * s);
      onHeight?.(i.offsetHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={outer} className={className} style={{ height: crop ? undefined : height, overflow: "hidden" }}>
      <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}
