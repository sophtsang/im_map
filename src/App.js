import { useState, useEffect, useRef  } from 'react';
import { useReducer } from 'react';
import './App.css';
import Stack from '@mui/material/Stack'
import { kernel, tiler } from './kernel';
import registry from './apps/Registry'
import { initialWM, wmReducer } from './desktop/WindowManager'
import Layout from './desktop/Layout'

// these are basically the app formats and locations of the project pages
import TermApp from './apps/terminal/TermApp'
import TruckApp from './apps/truck/TruckApp'
import DopplApp from './apps/doppelganger/DopplApp'
import ResumeApp from './apps/resume/ResumeApp'
import Cursor from './cursor/Cursor';

function App({ enableUI, animate } ) {
  const dragBannerWidth = 35;
  const childeWidth = 24;
  const narwhalWidth = 36;
  const screenWidth = 84;
  const screenHeight = 59;
  const ppid = 1;
  
  const nodeRef = useRef(null);
  const screenRef = useRef(null);
  const [compFrame, setCompFrame] = useState(animate ? 0 : 11);

  const {width, height} = useWindowSize();
  const [scale, setScale] = useState(window.innerWidth / 1520);
  const [dragEnabled, setDragEnabled] = useState(true);
  const [dragHover, setDragHover] = useState(false);

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
              tiler.insert(focused, p.pid); // here eventually we want to be able to modify screen sizes: so focus on a window
                // then ratio = i.e. for Horizontal, normalized x-position of drag cursos in screenWidth
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
      <Cursor width={width} screenWidth={screenWidth} />
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

          {(compFrame == 11) && enableUI && (<div className="absolute top-[0%] left-[0%] w-[100%] h-[100%] bg-transparent">
            {/* apps */}
            <DopplApp nodeRef={nodeRef} open={open} dragEnabled={dragEnabled} screenWidth={screenWidth} width={width} />
            <TruckApp nodeRef={nodeRef} open={open} dragEnabled={dragEnabled} screenWidth={screenWidth} width={width} />
            <TermApp nodeRef={nodeRef} open={open} dragEnabled={dragEnabled} screenWidth={screenWidth} width={width} />
            <ResumeApp nodeRef={nodeRef} open={open} dragEnabled={dragEnabled} screenWidth={screenWidth} width={width} />
            
            <button className="control-btn"
                onClick={handleCtrl} 
                onMouseEnter={() => setDragHover(true)}
                onMouseLeave={() => setDragHover(false)}
                style={{
                  background: 'none',
                  border: 'none'
                }}
            >
              {dragEnabled && (<img 
                  src={process.env.PUBLIC_URL + "/assets/childe.png"} 
                  alt="childe" 
                  className="childe"
                  style={{
                    position: 'absolute',
                    top: 6 * (width / screenWidth),
                    left: 67 * (width / screenWidth),
                    width: (width * childeWidth / screenWidth) / 2,
                    zIndex: 5
                  }}
                />)
              }
              
              {!dragEnabled && (<img 
                  src={process.env.PUBLIC_URL + "/assets/narwhal.png"} 
                  alt="narwhal" 
                  className="narwhal"
                  style={{
                    position: 'absolute',
                    top: 8 * (width / screenWidth),
                    left: 68 * (width / screenWidth),
                    width: (width * narwhalWidth / screenWidth) / 4,
                    zIndex: 5
                  }}
                />)
              }

              {dragHover && (<img 
                  src={process.env.PUBLIC_URL + "/assets/" + dragEnabled + "_drag.png"} 
                  alt={dragEnabled + "_drag.png"}
                  className="drag"
                  style={{
                    position: 'absolute',
                    top: 18 * (width / screenWidth),
                    left: 64 * (width / screenWidth),
                    width: (width * dragBannerWidth / screenWidth) / 2,
                    zIndex: 5
                  }}
                />)}
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