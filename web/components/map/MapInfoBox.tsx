"use client";

import { useEffect, useRef, useState } from "react";

export function MapInfoBox() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="map-info-root">
      <button
        type="button"
        className={`map-info-trigger ${open ? "map-info-trigger-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="map-info-panel"
      >
        <span className="map-info-icon" aria-hidden>
          i
        </span>
        <span>How this map works</span>
      </button>

      {open ? (
        <div id="map-info-panel" className="map-info-panel" role="dialog" aria-label="Map guide">
          <div className="map-info-header">
            <p className="section-label">Guide</p>
            <h3 className="font-serif text-lg font-normal mt-1">Reading the map</h3>
            <button
              type="button"
              className="map-info-close"
              onClick={() => setOpen(false)}
              aria-label="Close guide"
            >
              ×
            </button>
          </div>

          <div className="map-info-body">
            <section>
              <h4>2D / 3D view</h4>
              <p>
                Use the <strong>View</strong> toggle in the sidebar. <strong>3D</strong> raises
                boroughs by metric severity (red = taller). <strong>2D</strong> is a flat
                choropleth — same colours, easier to read and pan.
              </p>
            </section>

            <section>
              <h4>Borough shapes</h4>
              <p>
                Each London borough is coloured by the metric you pick (approval rate, delay,
                repeat share, Census, IMD, etc.). In 3D mode, height scales with the same value.
              </p>
            </section>

            <section>
              <h4>Live data</h4>
              <p>
                Numbers come from the Housing Intent Engine MCP on each refresh — primarily{" "}
                <strong>Foundations</strong> (2022–25 planning applications). Badges in the sidebar
                show which optional layers are loaded (Census, IMD, Housing in London, WhereToBuild).
              </p>
            </section>

            <section>
              <h4>Interact</h4>
              <ul>
                <li>
                  <strong>Click a borough</strong> — popup with Foundations stats plus any loaded
                  layers.
                </li>
                <li>
                  <strong>3D:</strong> left-drag to orbit (spin + tilt) · right-drag to pan ·
                  scroll to zoom · two-finger drag on trackpad tilts pitch.
                </li>
                <li>
                  <strong>2D:</strong> drag to pan · scroll to zoom.
                </li>
                <li>
                  <strong>Application points (2D only)</strong> — coloured by status. Hover for a
                  quick label; click for full details. Hidden in 3D so borough blocks stay clear.
                </li>
                <li>
                  <strong>Postcode lookup</strong> — enter a postcode and hit Go to fly there and
                  see planning constraints via MCP.
                </li>
              </ul>
            </section>

            <section>
              <h4>Filters</h4>
              <p>
                Use the sidebar to change metric, borough, app size, and status. Selecting a borough
                dims other blocks and zooms in. The legend at the bottom of the sidebar shows the
                colour scale for the active metric.
              </p>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
