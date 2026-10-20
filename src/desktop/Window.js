import registry from '../apps/Registry';

// window chrome: title bar + close button around the app's component.
// knows nothing about tiling: Layout decides `rect`, Window just draws there
export default function Window({ win, rect, zIndex, focused, dispatch, onClose }) {
  const app = registry[win.entry];
  const Program = app.component;

  return (
    <div
      className={`wm-window ${win.mode} ${focused ? "focused" : "bsod"}`} // replace "bsod" with ""
      // clicking anywhere in the window raises + focuses it
      onMouseDown={() => dispatch({ type: "FOCUS", pid: win.pid })}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        zIndex,
      }}
    >
      <div className="wm-tabbar">
        {app.name} (pid : {win.pid})
        <button
          // don't let the close click also dispatch FOCUS on a dying window
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => onClose(win.pid)}
        >x</button>
      </div>
      <div className="wm-content"><Program /></div>
    </div>
  );
}
