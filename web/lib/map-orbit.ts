import type { Map as MapboxMap } from "mapbox-gl";

const DRAG_THRESHOLD_PX = 4;

/** Left-drag orbit + right-drag pan for full 3D rotation (bearing and pitch). */
export function attach3dOrbitControls(map: MapboxMap): () => void {
  const canvas = map.getCanvas();

  map.dragPan.disable();
  map.dragRotate.disable();

  let dragging = false;
  let moved = false;
  let mode: "orbit" | "pan" | null = null;
  let startX = 0;
  let startY = 0;
  let startBearing = 0;
  let startPitch = 0;

  const onContextMenu = (e: MouseEvent) => e.preventDefault();

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) mode = "orbit";
    else if (e.button === 2) mode = "pan";
    else return;

    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    startBearing = map.getBearing();
    startPitch = map.getPitch();
    canvas.style.cursor = mode === "orbit" ? "grab" : "move";
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging || !mode) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    moved = true;
    e.preventDefault();

    if (mode === "orbit") {
      map.setBearing(startBearing + dx * 0.45);
      map.setPitch(Math.max(0, Math.min(85, startPitch - dy * 0.45)));
    } else {
      map.panBy([-dx, -dy], { animate: false });
      startX = e.clientX;
      startY = e.clientY;
    }
  };

  const endDrag = () => {
    dragging = false;
    mode = null;
    canvas.style.cursor = "";
  };

  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", endDrag);

  if (map.touchPitch) map.touchPitch.enable();
  map.touchZoomRotate.enableRotation();

  return () => {
    canvas.removeEventListener("contextmenu", onContextMenu);
    canvas.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", endDrag);
    map.dragPan.enable();
    map.dragRotate.disable();
    if (map.touchPitch) map.touchPitch.disable();
  };
}

export function restore2dNavigation(map: MapboxMap) {
  map.dragPan.enable();
  map.dragRotate.disable();
  if (map.touchPitch) map.touchPitch.disable();
  map.setMaxPitch(0);
  map.setPitch(0);
  map.setBearing(0);
}

export function configure3dNavigation(map: MapboxMap) {
  map.setMaxPitch(85);
  map.setMinPitch(0);
}
