import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Hash, Radio } from "lucide-react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const initialLegendWidth = 250;
const legendMargin = 16;

export default function MapSiteLegend({
  sites = [],
  selectedSite,
  hoveredSite,
  sidebarOpen,
  onSiteClick,
  onSiteHover,
  onSiteLeave,
  getColorBySector,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: legendMargin, y: legendMargin });
  const [size, setSize] = useState({ width: initialLegendWidth, height: 360 });
  const legendRef = useRef(null);
  const dragStateRef = useRef(null);
  const didSetInitialPositionRef = useRef(false);
  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  const activeSite = useMemo(() => {
    if (!selectedSite) return null;
    return sites.find((site) => site.SITEID === selectedSite.SITEID) || selectedSite;
  }, [selectedSite, sites]);

  const applyPosition = useCallback((nextPosition) => {
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  }, []);

  const applySize = useCallback((nextSize) => {
    sizeRef.current = nextSize;
    setSize(nextSize);
  }, []);

  const clampToViewport = useCallback((nextPosition, nextSize) => {
    const parentRect = legendRef.current?.parentElement?.getBoundingClientRect();
    const viewportWidth = parentRect?.width || window.innerWidth || 1280;
    const viewportHeight = parentRect?.height || window.innerHeight || 720;
    const maxWidth = Math.max(240, Math.min(520, viewportWidth - legendMargin * 2));
    const maxHeight = Math.max(180, Math.min(620, viewportHeight - legendMargin * 2));
    const width = clamp(nextSize.width, 240, maxWidth);
    const height = clamp(nextSize.height, 180, maxHeight);
    return {
      position: {
        x: clamp(nextPosition.x, legendMargin, Math.max(legendMargin, viewportWidth - width - legendMargin)),
        y: clamp(nextPosition.y, legendMargin, Math.max(legendMargin, viewportHeight - legendMargin - 80)),
      },
      size: { width, height },
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const parentRect = legendRef.current?.parentElement?.getBoundingClientRect();
      const parentWidth = parentRect?.width || window.innerWidth || 1280;
      const nextPosition = didSetInitialPositionRef.current
        ? positionRef.current
        : { x: parentWidth - sizeRef.current.width - legendMargin, y: legendMargin };
      didSetInitialPositionRef.current = true;
      const clamped = clampToViewport(nextPosition, sizeRef.current);
      applyPosition(clamped.position);
      applySize(clamped.size);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [applyPosition, applySize, clampToViewport]);

  const handlePointerMove = useCallback((event) => {
    const state = dragStateRef.current;
    if (!state) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const viewportWidth = window.innerWidth || 1280;
    const viewportHeight = window.innerHeight || 720;

    if (state.mode === "drag") {
      const clamped = clampToViewport({
        x: state.startPosition.x + dx,
        y: state.startPosition.y + dy,
      }, state.startSize);
      applyPosition(clamped.position);
      return;
    }

    const clamped = clampToViewport(state.startPosition, {
      width: clamp(state.startSize.width + dx, 240, Math.max(240, Math.min(520, viewportWidth - state.startPosition.x - legendMargin))),
      height: clamp(state.startSize.height + dy, 180, Math.max(180, Math.min(620, viewportHeight - state.startPosition.y - legendMargin))),
    });
    applyPosition(clamped.position);
    applySize(clamped.size);
  }, [applyPosition, applySize, clampToViewport]);

  const stopPointerTracking = useCallback(() => {
    dragStateRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopPointerTracking);
  }, [handlePointerMove]);

  const startPointerTracking = useCallback((event, mode) => {
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: positionRef.current,
      startSize: sizeRef.current,
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopPointerTracking);
  }, [handlePointerMove, stopPointerTracking]);

  return (
    <div
      ref={legendRef}
      className="absolute z-10 max-w-[calc(100vw-1rem)]"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
      }}
    >
      <div className="relative overflow-hidden rounded-[22px] border border-slate-800/80 bg-slate-950/90 text-slate-100 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <div className="flex w-full items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3 transition hover:bg-slate-900/60">
          <div
            role="button"
            tabIndex={0}
            onPointerDown={(event) => startPointerTracking(event, "drag")}
            className="flex min-w-0 flex-1 cursor-move items-center gap-3"
            title="Drag to move legend"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/90 text-white shadow-md shadow-blue-500/20">
              <Radio className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">Site Legend</span>
                <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs font-black text-blue-400">
                  {sites.length}
                </span>
              </div>
              <div className="truncate text-xs text-slate-400">
                {open
                  ? "Click a site to highlight it on the map"
                  : activeSite
                    ? `Selected: ${activeSite.Site_Name || activeSite.SITEID}`
                    : "Open dropdown to choose a site"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-white"
            title={open ? "Collapse legend" : "Expand legend"}
          >
            <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {!open && activeSite && (
          <button
            type="button"
            onClick={() => onSiteClick(activeSite)}
            className="flex w-full items-center justify-between gap-3 border-b border-slate-800/40 bg-blue-950/20 px-4 py-3 text-left hover:bg-blue-900/30"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-white">{activeSite.Site_Name}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <Hash className="h-3 w-3 shrink-0 text-blue-400" />
                <span className="truncate">{activeSite.SITEID}</span>
              </div>
            </div>
            <span className="rounded-full border border-blue-500/40 bg-blue-600 px-2.5 py-1 text-xs font-black text-white shadow-sm">
              Active
            </span>
          </button>
        )}

        {open && (
        <div className="overflow-y-auto p-2.5 space-y-2" style={{ maxHeight: size.height }}>
          {sites.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-400">No plotted sites found.</p>
          ) : (
            sites.map((site) => {
              const cells = Array.isArray(site.cells) ? site.cells : [];
              const cellsBySector = cells.reduce((acc, cell) => {
                const sector = String(cell.Sector || cell.SEC || cell.Sector_ID || cell.Cell_Name?.split("_").pop() || "A").slice(-1).toUpperCase();
                acc[sector] = (acc[sector] || 0) + 1;
                return acc;
              }, {});
              const sectors = Object.keys(cellsBySector).sort();
              const selected = selectedSite?.SITEID === site.SITEID;
              const hovered = hoveredSite === site.SITEID;

              return (
                <button
                  key={site.SITEID}
                  type="button"
                  onClick={() => onSiteClick(site)}
                  onMouseEnter={() => onSiteHover(site.SITEID)}
                  onMouseLeave={onSiteLeave}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                    selected
                      ? "border-blue-500/80 bg-blue-950/50 shadow-md shadow-blue-500/10"
                      : hovered
                        ? "border-slate-700 bg-slate-900/90 shadow-sm"
                        : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{site.Site_Name}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <Hash className="h-3 w-3 shrink-0 text-slate-500" />
                      <span className="truncate">{site.SITEID}</span>
                    </div>
                  </div>
                  <div className="flex max-w-[45%] shrink-0 items-center gap-1.5 overflow-x-auto">
                    {sectors.map((sector) => {
                      const colors = getColorBySector(sector, 1);
                      return (
                        <span
                          key={sector}
                          className="inline-flex shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-sm"
                          style={{ backgroundColor: colors.fill }}
                          title={`Sector ${sector}: ${cellsBySector[sector]} cell(s)`}
                        >
                          {sector}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })
          )}
        </div>
        )}
        <button
          type="button"
          onPointerDown={(event) => startPointerTracking(event, "resize")}
          className="absolute bottom-1 right-1 h-5 w-5 cursor-nwse-resize rounded-br-[18px] rounded-tl-lg border-b-2 border-r-2 border-slate-600 bg-slate-900/90 hover:bg-blue-600/40"
          title="Resize legend"
          aria-label="Resize site legend"
        />
      </div>
    </div>
  );
}

