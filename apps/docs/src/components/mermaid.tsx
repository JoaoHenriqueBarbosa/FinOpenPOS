"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

// ── Theme detection ──

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getIsDark() {
  return document.documentElement.classList.contains("dark");
}

function useIsDark() {
  return useSyncExternalStore(subscribe, getIsDark, () => false);
}

// ── Export ──

let counter = 0;

function svgToPng(svgEl: SVGSVGElement, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const box = svgEl.getBoundingClientRect();
    const w = box.width * scale;
    const h = box.height * scale;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));

    const data = new XMLSerializer().serializeToString(clone);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle =
        getComputedStyle(document.documentElement).getPropertyValue(
          "background-color",
        ) ||
        (document.documentElement.classList.contains("dark")
          ? "#0a0a0a"
          : "#ffffff");
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.95,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Zoom & Pan hook ──

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;
const PADDING = 48; // px padding inside the container

function useZoomPan(viewportRef: React.RefObject<HTMLDivElement | null>, svgRef: React.RefObject<HTMLDivElement | null>) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const computeBaseScale = useCallback(() => {
    const viewport = viewportRef.current;
    const content = svgRef.current?.querySelector("svg");
    if (!viewport || !content) return 1;

    const vw = viewport.clientWidth - PADDING * 2;
    const vh = viewport.clientHeight - PADDING * 2;
    const sw = content.getAttribute("width") ? parseFloat(content.getAttribute("width")!) : content.getBoundingClientRect().width;
    const sh = content.getAttribute("height") ? parseFloat(content.getAttribute("height")!) : content.getBoundingClientRect().height;

    if (!sw || !sh) return 1;
    return Math.min(vw / sw, vh / sh, 3);
  }, [viewportRef, svgRef]);

  const fit = useCallback(() => {
    setBaseScale(computeBaseScale());
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [computeBaseScale]);

  const onWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    const bs = baseScale;

    setZoom((prevZoom) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM,
        prevZoom * (e.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP),
      ));
      const ratio = 1 - (bs * next) / (bs * prevZoom);
      setPan((p) => ({
        x: p.x + (mx - p.x) * ratio,
        y: p.y + (my - p.y) * ratio,
      }));
      return next;
    });
  }, [baseScale]);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(MAX_ZOOM, z * (1 + ZOOM_STEP))),
    [],
  );
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(MIN_ZOOM, z * (1 - ZOOM_STEP))),
    [],
  );

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  }, []);

  const handlers = { onWheel, onPointerDown, onPointerMove, onPointerUp, onMouseDown };
  const actualScale = baseScale * zoom;
  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${actualScale})`;
  const pct = Math.round(zoom * 100);

  return { handlers, transform, pct, zoomIn, zoomOut, fit };
}

// ── Icons ──

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function DownloadIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg {...iconProps}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg {...iconProps}>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...iconProps}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg {...iconProps}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
    </svg>
  );
}

// ── Component ──

const btnClass =
  "rounded-md p-1.5 text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-accent transition-colors";

export function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const isDark = useIsDark();
  const idRef = useRef(`mermaid-${++counter}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgContentRef = useRef<HTMLDivElement>(null);
  const zp = useZoomPan(viewportRef, svgContentRef);

  // Fit diagram when entering fullscreen (after DOM paints)
  useEffect(() => {
    if (fullscreen) {
      requestAnimationFrame(() => zp.fit());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, svg]);

  useEffect(() => {
    let cancelled = false;
    const renderId = `${idRef.current}-${Date.now()}`;

    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "neutral",
        fontFamily: "inherit",
      });

      try {
        const { svg } = await mermaid.render(renderId, chart.trim());
        if (!cancelled) setSvg(svg);
      } catch {
        // mermaid can throw on rapid re-renders; ignore stale attempts
      } finally {
        document.getElementById(renderId)?.remove();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chart, isDark]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [fullscreen]);

  const exportJpg = useCallback(async () => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;
    const blob = await svgToPng(svgEl);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.jpg";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (!svg) {
    return (
      <div className="my-4 flex items-center justify-center rounded-lg border bg-fd-card p-8 text-fd-muted-foreground">
        Loading diagram...
      </div>
    );
  }

  const zoomControls = (
    <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-lg border bg-fd-card/90 p-0.5 shadow-sm backdrop-blur-sm">
      <button type="button" onClick={zp.zoomOut} className={btnClass} title="Zoom out">
        <MinusIcon />
      </button>
      <span className="min-w-[3ch] select-none text-center text-xs tabular-nums text-fd-muted-foreground">
        {zp.pct}%
      </span>
      <button type="button" onClick={zp.zoomIn} className={btnClass} title="Zoom in">
        <PlusIcon />
      </button>
      <div className="mx-0.5 h-4 w-px bg-fd-border" />
      <button type="button" onClick={zp.fit} className={btnClass} title="Fit to view">
        <FitIcon />
      </button>
    </div>
  );

  const actionButtons = (
    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button type="button" onClick={exportJpg} className={btnClass} title="Export as JPG">
        <DownloadIcon />
      </button>
      <button
        type="button"
        onClick={() => setFullscreen((v) => !v)}
        className={btnClass}
        title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
      </button>
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fd-background/80 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) setFullscreen(false);
        }}
      >
        <div className="group relative flex h-full w-full overflow-hidden rounded-xl border bg-fd-card shadow-lg">
          {actionButtons}
          <div
            ref={viewportRef}
            className="flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing"
            {...zp.handlers}
          >
            <div
              ref={svgContentRef}
              style={{ transform: zp.transform, transformOrigin: "center center" }}
              className="pointer-events-none"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
          {zoomControls}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative my-4 overflow-x-auto rounded-lg border bg-fd-card p-4">
      {actionButtons}
      <div
        ref={containerRef}
        className="flex justify-center [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
