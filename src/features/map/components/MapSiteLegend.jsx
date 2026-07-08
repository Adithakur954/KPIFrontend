import { Hash, Radio } from "lucide-react";

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
  return (
    <div
      className={`absolute bottom-6 z-10 w-80 max-w-[calc(100vw-2rem)] transition-all duration-300 ${
        sidebarOpen ? "left-[440px]" : "left-6"
      }`}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <div className="text-sm font-black text-slate-900">Site Legend</div>
            <div className="text-xs text-slate-500">Click a site to highlight it on the map</div>
          </div>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
            {sites.length}
          </span>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {sites.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">No plotted sites found.</p>
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
                  className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : hovered
                        ? "border-slate-300 bg-slate-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-slate-900">{site.Site_Name}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Hash className="h-3 w-3 shrink-0" />
                      <span className="truncate">{site.SITEID}</span>
                    </div>
                  </div>
                  <div className="flex max-w-[45%] shrink-0 items-center gap-1.5 overflow-x-auto">
                    {sectors.map((sector) => {
                      const colors = getColorBySector(sector, 1);
                      return (
                        <span
                          key={sector}
                          className="inline-flex shrink-0 items-center justify-center rounded-full px-2 py-1 text-xs font-bold text-white"
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
      </div>
    </div>
  );
}
