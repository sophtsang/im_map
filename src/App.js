import { useState, useEffect, useLayoutEffect, useRef  } from 'react';
import { Navigate, useNavigate } from "react-router-dom";
import { useReducer } from 'react';
import './App.css';
import Draggable from "react-draggable";
import Stack from '@mui/material/Stack'
import { kernel, tiler, version } from './kernel';
import registry from './apps/Registry'
import { initialWM, wmReducer } from './desktop/WindowManager'
import Layout from './desktop/Layout'

function App({ openDict, enableUI, popup, animate, responsivePopup } ) {
  const taxiWidth = 16;
  const raceCarWidth = 16;
  const lidarBannerWidth = 41;
  const dopplBannerWidth = 59;
  const screenWidth = 84;
  const screenHeight = 59;
  const ppid = 1;
  
  const nodeRef = useRef(null);
  const screenRef = useRef(null);
  const popupInitialized = useRef(false);
  const [lidarHover, setLidarHover] = useState(false);
  const [dgHover, setDGHover] = useState(false);
  const [paintHover, setPaintHover] = useState(false);
  const navigate = useNavigate();
  const [compFrame, setCompFrame] = useState(animate ? 0 : 11);

  const holdTimer = useRef(null);
  const {width, height} = useWindowSize();
  const [scale, setScale] = useState(window.innerWidth / 1520);
  const [dragEnabled, setDragEnabled] = useState(false);

  // kernel
  const [processes, setProcesses] = useState(kernel.ps());
  // window manager
  const [wm, dispatch] = useReducer(wmReducer, initialWM);

  useEffect(() => {
    // the window new tiled windows split from: only a visible tiled window is in the tiler,
    // so a floating/minimized focus means no split target (tiler splits the whole screen)
    const fwin = wm.windows[wm.focused];
    let focused = fwin && fwin.mode === "tiled" && !fwin.minimized ? fwin.pid : undefined;
    for (const p of processes) {
      const app = registry[p.entry];
      // new process opened and new window spawned, keep wm and tiler in sync
      if (app && p.state !== "Finished" && wm.windows[p.pid] === undefined) {
          const mode = app.mode ?? "tiled";
          dispatch({
              type: "OPEN", pid: p.pid, entry: p.entry, mode,
              floatRect: { x: 40 + 24 * p.pid, y: 40 + 24 * p.pid, w: app.size?.w, h: app.size?.h },
          })
          if (mode === "tiled") {
            try {
              tiler.insert(focused, p.pid);
              focused = p.pid;
            } catch (e) {
              console.warn(`tiler: couldn't insert ${p.pid}:`, e);
            }
          }
      }
    }
    for (const key in wm.windows)  {
      const pid = Number(key);
      const alive = processes.some(p => p.pid === pid && p.state !== "Finished");
      if (! alive) {
        dispatch({type: "CLOSED", pid: pid})
        if (wm.windows[pid].mode === "tiled") {
          try {
            tiler.remove(pid);
          } catch (e) {
            console.warn(`tiler: couldn't remove ${pid}:`, e);
          }
        }
      }
    }
  }, [processes]); // if processes change -> run this, so processes will have events

  // Only used when `responsivePopup` is set (currently just the streets/
  // Colmap+GetData widget) — keeps that popup's own width, centering, and
  // drag range tied to the actual window size without touching the
  // computer-screen frame, background image, or icon positions that every
  // other popup (e.g. Lidar) still relies on via the original hardcoded
  // bounds below.
  const [popupWidth, setPopupWidth] = useState(() => Math.min(1000, window.innerWidth * 0.85));
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [popupBounds, setPopupBounds] = useState({ left: 0, top: 0, right: 0, bottom: 360 });

  const handlePopupDrag = (event, data) => {
    setPopupPos({ x: data.x, y: data.y });
  };

  function open(entry) {
    // App.js is process pid 1: init/desktop
      kernel.spawn(ppid, entry);
      // updated vec<&Pcb> from ps
      setProcesses(kernel.ps())
  }

  function close(pid) {
      // ways to clean up zombies: 
      // either by any other process (check zombies before returning to RUNNING)
      // by parent when it waits for it, here App.js parent will reap its children apps
      // this is the initial process, so supposedly will never die before child
      kernel.kill(pid);
      kernel.wait(ppid, pid);
      setProcesses(kernel.ps()) // update active processes
  }

  function useWindowSize() {
      const [windowSize, setWindowSize] = useState({
          width: window.innerWidth,
          height: window.innerHeight,
      });

      useEffect(() => {
          const handleResize = () => {
              setScale(window.innerWidth / 1520)
              setWindowSize({
                  width: window.innerWidth,
                  height: window.innerHeight,
              });
          };

          window.addEventListener('resize', handleResize);

          return () => window.removeEventListener('resize', handleResize);
      }, [window.innerWidth]);

      return windowSize;
  }

  useLayoutEffect(() => {
    if (!responsivePopup || !screenRef.current) {
      return;
    }

    const screenOffsetX = screenRef.current.getBoundingClientRect().x;
    const winWidth = window.innerWidth;
    const nextPopupWidth = Math.min(1000, winWidth * 0.85);
    const centeredX = (winWidth - nextPopupWidth) / 2 - screenOffsetX;
    const maxOffset = Math.max(0, (winWidth - nextPopupWidth) / 2);
    const nextBounds = {
      left: centeredX - maxOffset,
      right: centeredX + maxOffset,
      top: 0,
      bottom: 360
    };

    setPopupWidth(nextPopupWidth);
    setPopupBounds(nextBounds);

    if (!popupInitialized.current) {
      popupInitialized.current = true;
      setPopupPos({ x: centeredX, y: 0 });
    } else {
      setPopupPos((prev) => ({
        x: Math.min(Math.max(prev.x, nextBounds.left), nextBounds.right),
        y: Math.min(Math.max(prev.y, nextBounds.top), nextBounds.bottom)
      }));
    }
  }, [responsivePopup, width]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        navigate("/kernel_bsod");
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useEffect(() => {
    const handleCAT = (event) => {
      if (event.ctrlKey && event.altKey && event.code === "KeyT") {
        open("terminal")
      }
    };

    window.addEventListener("keydown", handleCAT);

    return () => {
      window.removeEventListener("keydown", handleCAT);
    };
  }, []);

  const handleCtrl = () => {
    console.log(!dragEnabled)
    setDragEnabled(!dragEnabled)
  };

  useEffect(() => {
    if (compFrame < 11) {
      const interval = setInterval(() => {
        setCompFrame((prev) => prev + 1);
      }, 50);

      return () => clearInterval(interval);
    }
  }, [compFrame]);

  useEffect(() => {
    document.title = "gegangen";
    document.body.style.overflow = "hidden";
  }, []);

  return (
    <div className="App">
      <div className="kernel-version">{version()}</div>


      <Stack 
        direction="row"
        sx={{ 
            alignItems: 'center',
            mb: 140
        }}
      >

        <div className="computer screen"
            ref={screenRef}
            style={{
                position: 'relative',
                width: '100%' // windows (.popup) center against this
            }}
        >
          <img 
            src={process.env.PUBLIC_URL + `/assets/computer_screen.png`}
            alt="computer" 
            className="w-full h-full object-cover rounded-xl shadow-lg" 
            style={{
              zIndex: 0,
              position: 'absolute',
              width: width,
              left: width/2 - 760 * scale
            }}
          />

          {(compFrame == 11) && enableUI && (<div className="absolute top-[0%] left-[0%] w-[100%] h-[100%] bg-transparent z-10">
            <Draggable
              cancel={dragEnabled ? "" : ".draggable-btn"}
              nodeRef={nodeRef}
              bounds={{ 
                left: 0, top: 0, 
                right: width - (taxiWidth + 8) * (width / screenWidth), 
                bottom: width - (taxiWidth + 34) * (width / screenWidth) }}>       
              <div className="draggable"
                  ref={nodeRef}
              >
                <button 
                  className={`draggable-btn ${dragEnabled ? "drag-active" : ""}`}
                  onDoubleClick={() => open("streets")}
                  onMouseEnter={() => setDGHover(true)}
                  onMouseLeave={() => setDGHover(false)}
                  style={{
                      background: 'none',
                      border: 'none',
                      zIndex: 1,
                      position: 'absolute',
                      top: 4 * (width / screenWidth),
                      left: 3 * (width / screenWidth)
                    }}
                >
                  <img 
                    src={process.env.PUBLIC_URL + "/assets/taxi.png"} 
                    alt="_'s for the streets" 
                    className="taxi-btn"
                    style={{
                      width: width * taxiWidth / screenWidth
                    }}
                  />
                </button>

                {dgHover && (<img 
                  src={process.env.PUBLIC_URL + "/assets/doppelgangers.png"} 
                  alt="_'s for the streets" 
                  className="w-16 h-16 transition-transform"
                  style={{
                    position: 'absolute',
                    top: -5 * (width / screenWidth),
                    left: -18 * (width / screenWidth),
                    width: width * dopplBannerWidth / screenWidth,
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />)}
              </div>
            </Draggable>

            <Draggable 
              cancel={dragEnabled ? "" : ".draggable-btn"}
              nodeRef={nodeRef}
              bounds={{ 
                left: - (raceCarWidth + 2) * (width / screenWidth), 
                top: 0, 
                right: width - (raceCarWidth + 26) * (width / screenWidth), 
                bottom: width - (raceCarWidth + 34) * (width / screenWidth) }}
            >        
              <div className="draggable-btn"
                  ref={nodeRef}
              >
                <button className={`draggable-btn ${dragEnabled ? "drag-active" : ""}`}
                        // onDoubleClick={openDict["openVroom"]} 
                        onDoubleClick={() => open("truck")}
                        onMouseEnter={() => setLidarHover(true)}
                        onMouseLeave={() => setLidarHover(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          zIndex: 3,
                          position: 'absolute',
                          top: 4 * (width / screenWidth),
                          left: 21 * (width / screenWidth)
                        }}
                >
                  <img 
                    src={process.env.PUBLIC_URL + "/assets/racecar.png"} 
                    alt="vroom vroom" 
                    className="racecar-btn"
                    style={{
                      width: width * raceCarWidth / screenWidth
                    }}
                  />
                </button>

                {lidarHover && (<img 
                  src={process.env.PUBLIC_URL + "/assets/lidar.png"} 
                  alt="_'s for the streets" 
                  className="w-16 h-16 transition-transform"
                  style={{
                    position: 'absolute',
                    top: -5 * (width / screenWidth),
                    left: 9 * (width / screenWidth),
                    width: width * lidarBannerWidth / screenWidth,
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />)}
              </div>
            </Draggable>

            <button className="control-btn"
                onClick={handleCtrl} 
                style={{
                  background: 'none',
                  border: 'none'
                }}
            >
              {!dragEnabled && (<img 
                  src={process.env.PUBLIC_URL + "/assets/childe.png"} 
                  alt="childe" 
                  className="childe"
                  style={{
                    position: 'absolute',
                    top: 6 * (width / screenWidth),
                    left: 67 * (width / screenWidth),
                    width: (width * 24 / screenWidth) / 2
                  }}
                />)
              }
              
              {dragEnabled && (<img 
                  src={process.env.PUBLIC_URL + "/assets/narwhal.png"} 
                  alt="narwhal" 
                  className="narwhal"
                  style={{
                    position: 'absolute',
                    top: 8 * (width / screenWidth),
                    left: 68 * (width / screenWidth),
                    width: (width * 36 / screenWidth) / 4
                  }}
                />)
              }

              
            </button>
                
          </div>)}

          <Layout
            wm={wm}
            dispatch={dispatch}
            // TODO: calibrate to the monitor's screen region in computer_screen.png
            area={{ 
              x: width * 5 / screenWidth, 
              y: width * 5 / screenWidth, 
              w: width * (screenWidth - 10) / screenWidth, 
              h: width * (screenHeight - 10) / screenWidth}}
            onClose={close}
          />
        </div>
      </Stack>
      
    </div>
  );
}

export default App;