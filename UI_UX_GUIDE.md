# Portal UI conventions

The shared shell groups navigation into Monitoring, Analysis and Administration.
Role permissions continue to determine which routes are visible. Desktop sidebar
width is remembered; mobile navigation has a dedicated header, Escape dismissal,
focus containment and focus restoration. The skip link leads to main content.

## Visual language

Use the `--portal-*` tokens in `src/styles/globals.css`: neutral canvas, white
surfaces, slate text, blue actions, 12px card corners. Use text labels alongside
severity colours. Keep one clear primary action per task and put alternative
export formats in `ExportMenu`. Use descriptive format names, never numbered
formats. Preserve keyboard focus indicators and reduced-motion preferences.

## Screen hierarchy

- Dashboard: source scope, evaluated threshold summary, comparison shortcut,
  source upload timestamp, inventory and KPI values. Upload time describes the
  upload, not observation freshness. Threshold summary excludes missing samples.
- KPI: source selection, optional column configuration, collapsible comparison
  dates/dimension filters, active-filter chips, paginated charts. Export labels
  describe both workbook formats and the PDF's current-page scope.
- RCA: configuration remains accessible, then collapses when current-scope
  results arrive. Cause cells contain cause/additional patterns only. The
  recommendations checkbox is opt-in. Evidence is accessible in the row details
  drawer when returned by the API. Tables offer comfortable/compact density.
- Map: show the basemap independently of site data and the deferred renderer.
  Filters start closed, open as a compact desktop panel/mobile bottom sheet.
  Existing selected-site details and layer controls remain available. Avoid
  blocking covers or rebuilding the map for source/filter changes.
- Reports: comparison, report generation, delivery and automation stay separate.
  Keep partial reports, missing baselines and delivery uncertainty explicit.

Scrollable report/RCA tables keep the header and first column visible. Dialogs
use the native modal focus behaviour and Escape, and restore the previous focus.
Keep transient service responses distinct from data timestamps.

## Verification

Run `npm run build` and `npm run test:frontend`. Browser scripts under the parent
`scripts/` exercise production KPI/Worst Cell, RCA and dashboard/navigation, plus
Map controls/readiness and report portal flows. These scripts intercept APIs with
synthetic data; screenshots are UI examples, not customer reports. They do not
import customer data or send emails.

Build warnings for the deferred renderer/PDF chunks and existing Dashboard hook
dependency warnings remain; the design changes do not claim a measured speedup.

## Shared components and developer workflow

The second design pass introduces an explicit component layer:

| Component / module | Responsibility |
| --- | --- |
| `shared/navigation/portalNavigation.js` | Page labels, descriptions, groups, icons and display roles for the sidebar and search. Route guards/backend still authorize access. |
| `PageHeading` | Responsive title, description, eyebrow, optional icon and actions slot. Used by Dashboard, KPI, Reports, RCA, Worst Cell and Uploads. |
| `PageState` | Loading, empty and error feedback with an optional real recovery action. |
| `Modal` | Native modal behaviour, unique title IDs, body scroll locking and focus restoration. Supports a drawer or centered dialog. |
| `DetailDialog` | Compatibility wrapper for the existing RCA details drawer. |
| `QuickNavigation` | Role-filtered page search, arrow-key selection and keyboard navigation. No API requests. |
| `OverviewPanel` / `InventoryCard` | Dashboard presentation; receive real values through props and do not fetch data. |

Use `Ctrl+K` (or `Cmd+K`) to find a page; mobile users can use the search icon.
Search supports Enter, arrow keys and Escape. Existing modal dialogs take
precedence over the global shortcut. Page titles update the browser tab.

```jsx
<PageHeading
  title="Daily reports"
  eyebrow="Analysis / Daily reporting"
  description="Compare performance and review delivery history."
  actions={<button type="button" className="portal-button" onClick={refresh}>Refresh</button>}
/>
<PageState
  variant="error"
  title="Reports could not load"
  action={<button type="button" className="portal-button" onClick={retry}>Retry</button>}
>
  {errorMessage}
</PageState>
```

Styles are split into `globals.css` (imports, base typography and PDF capture),
`portal.css` (existing shell/table compatibility), and `workspace.css` (explicit
component classes). New components should use named classes and design tokens
instead of depending on the number of nested divs in a page. Keep semantic status
colours separate from decorative accents. The overview bar represents assessed
KPI aggregates; it is not a site-health percentage or a prediction.

Run `npm run check:ui` for the shared UI layer, `npm run test:frontend` for data
correctness checks, and `npm run build` before browser verification. The focused
UI check is not a replacement for checking changed feature files. Production
browser checks in `scripts/test_portal_design_browser.py` cover keyboard search,
role visibility, mobile layout and focus restoration with synthetic fixtures.
The analytics, RCA, report and map browser scripts cover the existing workflows.

Import all three stylesheets directly from `src/main.jsx`. This keeps custom
component styles visible to Vite's development module graph as well as the
production build. The portal browser check asserts computed grid/flex styles
and the overview background so missing styles fail verification. Run it once
against preview (default port 4173) and once with `PORTAL_TEST_BASE_URL` set to
`http://localhost:5173` to verify the running dev server too.

## Map workspace

Map-specific rules live in `styles/map-workspace.css`, imported directly by
`MapPage.jsx` so both route navigation and hot updates retain the dependency.
The toolbar shows readiness and filtered site/cell counts without
blocking the basemap. Fit sites uses the current filtered coordinates; a single
site pans to a useful zoom instead of zooming to the provider's maximum.

The filter drawer uses a compact statistics row and a flex-based scroll area;
mobile uses the existing bottom sheet. Display settings dismiss with Escape or
an outside click. The site legend searches loaded names/IDs, preserves selection,
and initially renders at most 100 matching buttons with a Show more action.
Searching the legend does not remove sites from the actual map. Its move handle
supports arrow keys as well as dragging. Keep renderer/data readiness independent
of all these control states.

Filter and Analytics use one panel at a time, including when prediction results
open Analytics automatically. Analytics has a two-row tab grid with proper tab
roles and Arrow Left/Right, Home and End navigation. Escape closes the drawer
and restores focus to its toolbar trigger. Header extras scroll with the content
so they cannot push the tab navigation off screen. Hidden cell layers show Off;
zoom is rounded only for display, retaining the actual map precision.

`MapSummaryCards` presents inventory values without fetching data or inventing
trends. Keep the light site picker distinct from the darker analysis workspace;
sector colours retain white labels, while selected site rows use both a border
and pressed state. Map stylesheet checks run in the dev interaction test and the
production startup test to catch missing styles in either mode.

## RCA evidence presentation

The results table has a dedicated KPI evidence preview separate from cause and
recommendation columns. View evidence opens a responsive drawer with observed,
median and limit values, followed by driver scores. EvidencePanel owns its route
stylesheet; evidence.js reads the engine's Evidence key and the legacy KPI Evidence
alias. It parses only the known display grammar and preserves unfamiliar text.
Missing evidence/limits are explicit, and zero/negative values are not discarded.
Recommendations still require the existing checkbox. Unit cases and dev/production
browser checks verify the actual engine field name, numeric zero, mobile layout,
drawer Escape behaviour and independently hidden recommendations. Screenshots use
synthetic fixtures, not customer diagnoses.

RCA evidence targets: the Target column pairs each recorded evidence limit with
its direction from the scope-matched RCA configuration. Engine-friendly labels
are associated with canonical KPI configuration keys. A mismatched limit,
missing configuration or unknown direction shows Not available instead of an
inferred target. Both minimum (>=) and maximum (<=) targets preserve custom limits,
zero and negative numbers; units remain in the KPI label. This represents the
configured RCA KPI target, not an independently configured customer SLA.

RCA evidence displays one Target column (with direction) rather than duplicate
Limit and Target columns. The compact preview uses the same Target naming.
The numeric engine limit remains an internal input to target validation.

## RCA period mean

Evidence now carries a period arithmetic mean computed by the engine for the same
Short name/cell, KPI and filtered input period as its median. Missing, nonnumeric
and nonfinite mean inputs are excluded; zero and negative values remain. Every
available row has equal weight (not traffic/attempt weighted). Pre/Post means are
computed independently. Both in-memory and legacy workbook analysis paths emit
mean evidence, so captured exports retain it too.

The UI shows KPI | Observed | Period Mean | Median | Target. Older stored evidence
without mean remains readable and shows Not available; rerun RCA to populate it.
Mean is descriptive only and does not alter anomaly scores, causes or severity.
Run scripts/test_rca_mean.py with the application's Python for grouping/date/
Pre-Post/scoring invariance checks, plus scripts/test_rca_export.py for workbook
regressions. The frontend parser handles both old and mean-bearing evidence.
