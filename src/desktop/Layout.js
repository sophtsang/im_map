import './Layout.css';
import { tiler } from '../kernel';
import Window from './Window';

// tiled windows sit below every floating window, whatever their z
const TILED_Z = 10;
const FLOATING_Z = 100;

// places every window in wm on the desktop:
//   tiled    -> rectangle from the dwindle tree (tiler.layout)
//   floating -> its own floatRect
//   minimized windows aren't drawn
// area is the desktop region windows tile into: { x, y, w, h }
export default function Layout({ wm, dispatch, area, onClose }) {
  // recomputed every render: the tree only changes alongside a dispatch,
  // which re-renders, and area can change on resize
  let tiles = new Map();
  try {
    tiles = new Map(tiler.layout({ x: 0, y: 0, w: area.w, h: area.h })); // map window to pid
  } catch (e) {
    console.warn("tiler: layout failed:", e);
  }

  return (
    <div
      className="wm-layer"
      style={{ left: area.x, top: area.y, width: area.w, height: area.h }}
    >
      {Object.values(wm.windows).map((win) => {
        if (win.minimized) return null;

        let rect, zIndex;
        let gap = 9;
        if (win.mode === "tiled") { // so like if tiled then plae according to x, y, w, h
          rect = tiles.get(win.pid);
          // tiled but not in the tree: an insert failed, nowhere to put it
          if (rect === undefined) { return null; }
          else { rect = {x: rect.x + gap / 2, y: rect.y + gap / 2, w: rect.w - gap, h: rect.h - gap }}
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
    </div>
  );
}
