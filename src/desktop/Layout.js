import { useReducer, useRef, useState } from 'react';
import './Layout.css';
import { tiler } from '../kernel';
import Window from './Window';

// tiled windows sit below every floating window, whatever their z
const TILED_Z = 10;
const FLOATING_Z = 100;
const GAP = 9;
const EPS = 0.5;

// shared edges between tiles (pre-gap rects, so neighbors' edges line up exactly).
// each border knows the two pids on either side, which is all tiler.resize needs
function findBorders(tiles) {
  const list = [...tiles];
  const borders = [];
  for (const [a, A] of list) {
    for (const [b, B] of list) {
      if (Math.abs(A.x + A.w - B.x) < EPS) {
        const y0 = Math.max(A.y, B.y), y1 = Math.min(A.y + A.h, B.y + B.h);
        if (y1 - y0 > EPS) borders.push({ a, b, col: true, x: B.x - GAP / 2, y: y0, w: GAP, h: y1 - y0 });
      } else if (Math.abs(A.y + A.h - B.y) < EPS) {
        const x0 = Math.max(A.x, B.x), x1 = Math.min(A.x + A.w, B.x + B.w);
        if (x1 - x0 > EPS) borders.push({ a, b, col: false, x: x0, y: B.y - GAP / 2, w: x1 - x0, h: GAP });
      }
    }
  }
  return borders;
}

// places every window in wm on the desktop:
//   tiled    -> rectangle from the dwindle tree (tiler.layout)
//   floating -> its own floatRect
//   minimized windows aren't drawn
// area is the desktop region windows tile into: { x, y, w, h }
export default function Layout({ wm, dispatch, area, onClose }) {
  const layerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  // the tree lives outside React, so a resize has to force the re-render itself
  const [, bump] = useReducer(n => n + 1, 0);
  const bounds = { x: 0, y: 0, w: area.w, h: area.h };

  let tiles = new Map();
  try {
    tiles = new Map(tiler.layout(bounds));
  } catch (e) {
    console.warn("tiler: layout failed:", e);
  }

  function startDrag(e, border) {
    e.preventDefault();
    const cursor = border.col ? "col-resize" : "row-resize";
    setDragging(cursor);
    document.body.style.cursor = cursor;

    let latest = null, frame = null;
    const apply = () => {
      frame = null;
      try {
        tiler.resize(border.a, border.b, latest.x, latest.y, bounds);
        bump();
      } catch (err) {
        console.warn("tiler: resize failed:", err);
      }
    };
    const move = (ev) => {
      const r = layerRef.current.getBoundingClientRect();
      // scale handles any CSS transform between the screen and the layer
      latest = {
        x: (ev.clientX - r.left) * area.w / r.width,
        y: (ev.clientY - r.top) * area.h / r.height,
      };
      if (frame === null) frame = requestAnimationFrame(apply);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (frame !== null) cancelAnimationFrame(frame);
      setDragging(null);
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <div
      ref={layerRef}
      className={`wm-layer ${dragging ? "dragging" : ""}`}
      style={{ left: area.x, top: area.y, width: area.w, height: area.h }}
    >
      {Object.values(wm.windows).map((win) => {
        if (win.minimized) return null;

        let rect, zIndex;
        if (win.mode === "tiled") {
          rect = tiles.get(win.pid);
          // tiled but not in the tree: an insert failed, nowhere to put it
          if (rect === undefined) return null;
          rect = { x: rect.x + GAP / 2, y: rect.y + GAP / 2, w: rect.w - GAP, h: rect.h - GAP };
          zIndex = TILED_Z + win.z;
        } else {
          rect = win.floatRect;
          zIndex = FLOATING_Z + win.z;
        }

        return (
          <Window
            key={win.pid}
            win={win}
            rect={rect}
            zIndex={zIndex}
            focused={wm.focused === win.pid}
            dispatch={dispatch}
            onClose={onClose}
          />
        );
      })}

      {findBorders(tiles).map((border) => (
        <div
          key={`${border.a}-${border.b}`}
          className={`wm-handle ${border.col ? "col" : "row"}`}
          onMouseDown={(e) => startDrag(e, border)}
          style={{ left: border.x, top: border.y, width: border.w, height: border.h, zIndex: TILED_Z }}
        />
      ))}
    </div>
  );
}
