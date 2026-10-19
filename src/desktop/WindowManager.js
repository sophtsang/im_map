// Taking inspiration from Hyprland WM
// Will have Dwindle tiling
// WM state follows the process table, gives like a window
// representation for each active process in ```kernel```
// should somewhat be event based

// useReducer changes state of smth

export const initialWM = {
    windows: {},
    focused: null,
    activeWorkspace: 1,
    nextZ: 1 // this is z-index
}

// equivalent to pcb::transition, as in logic
// action relates to the window that just triggered this "event"
export function wmReducer(state, action) {
    switch(action.type) { // can open, close, focus, move, toggle_float, minimize window
        case "OPEN": {
            const window = {
                pid: action.pid,
                entry: action.entry,
                mode: action.mode, 
                floatRect: action.floatRect,
                z: state.nextZ, // WM keeps track of the global nextZ
                workspace: state.activeWorkspace,
                minimized: false,
            };
            return {
                ...state, // copy of state, which then we update windows, focused, nextZ
                windows: { ...state.windows, [action.pid]: window }, // new entry in map
                focused: action.pid, // the new window is the focus
                nextZ: state.nextZ + 1 // update WM
            };
        }
        case "CLOSED": {
            delete state.windows[action.pid]
            return {
                ...state, 
                windows: { ...state.windows }, // deleted closed window
                focused: state.focused === action.pid ? null : state.focused,
            };
        }
        case "FOCUS": {
            // basically user clicked on a window
            const window = state.windows[action.pid];
            if (window === undefined) return state;
            window.z = state.nextZ; // now the front window
            return {
                ...state,
                windows: { ...state.windows, [action.pid]: { ...window} },
                focused: action.pid,
                nextZ: state.nextZ + 1
            }
        }
        case "MINIMIZE": {
            // similar to CLOSE
            const window = state.windows[action.pid];
            if (window === undefined) return state;
            window.minimized = true;
            return {
                ...state, 
                windows: { ...state.windows, [action.pid]: { ...window } }, // deleted closed window
                focused: state.focused === action.pid ? null : state.focused,
            };
        }
        case "MOVE": {
            const window = state.windows[action.pid];
            if (window === undefined || window.mode !== "floating") return state; // as in in tiled mode
            window.floatRect = { ...window.floatRect, x: action.x, y: action.y }; // where the user dragged window to
            return {
                ...state, 
                windows: { ...state.windows, [action.pid]: { ...window } }, // deleted closed window
                focused: action.pid, // moved is now focused
            };
        }
        case "TOGGLE_FLOAT": {
            const window = state.windows[action.pid];
            if (window === undefined) return state;
            window.mode = window.mode === "floating" ? "tiled" : "floating"; // switch
            return {
                ...state,
                windows: { ...state.windows, [action.pid]: { ...window} },
                focused: action.pid
            }
            
        }
        default:
            return state;
    }
}