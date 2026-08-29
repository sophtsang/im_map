import { useState, useEffect, useRef  } from 'react';
import { Navigate, useNavigate } from "react-router-dom";
import './App.css';
import Draggable from "react-draggable";
import Stack from '@mui/material/Stack'

function App({ openDict, enableUI, popup, animate } ) {
  const nodeRef = useRef(null);
  const [lidarHover, setLidarHover] = useState(false);
  const [dgHover, setDGHover] = useState(false);
  const [paintHover, setPaintHover] = useState(false);
  const navigate = useNavigate();
  const [compFrame, setCompFrame] = useState(animate ? 0 : 11);

  const holdTimer = useRef(null);
  const {width, height} = useWindowSize();
  const [scale, setScale] = useState(Math.min(10, Math.floor(10 * (window.innerWidth / 1520)))/10);
  const [dragEnabled, setDragEnabled] = useState(false);
 
  function useWindowSize() {
      const [windowSize, setWindowSize] = useState({
          width: window.innerWidth,
          height: window.innerHeight,
      });

      useEffect(() => {
          const handleResize = () => {
              setScale(Math.min(10, Math.floor(10 * (window.innerWidth / 1520)))/10)
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
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        navigate("/im_map");
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
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
    document.title = "meow";
    document.body.style.overflow = "hidden";
  }, []);

  return (
    <div className="App">

      <Stack 
        direction="row"
        sx={{ 
            alignItems: 'center',
            mb: 140
        }}
      >

        <div className="computer screen"
            style={{ 
                position: 'relative'
            }}
        > 
          <img 
            src={process.env.PUBLIC_URL + `/computer${compFrame}.png`}
            alt="computer" 
            className="w-full h-full object-cover rounded-xl shadow-lg" 
            style={{
              zIndex: 0,
              position: 'absolute',
              width: 1520 * scale,
              left: width/2 - 760 * scale
            }}scal
          />

          {(compFrame == 11) && enableUI && (<div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-transparent z-10">
            <Draggable
              cancel={dragEnabled ? "" : ".draggable-btn"}
              nodeRef={nodeRef}
              bounds={{ left: 0, top: 0, right: 620 * scale, bottom: 360 * scale }}>       
              <div className="draggable"
                  ref={nodeRef}
              >
                <button 
                  className={`draggable-btn ${dragEnabled ? "drag-active" : ""}`}
                  onDoubleClick={openDict["openStreets"]}
                  onMouseEnter={() => setDGHover(true)}
                  onMouseLeave={() => setDGHover(false)}
                  style={{
                      background: 'none',
                      border: 'none',
                      zIndex: 1,
                      position: 'absolute',
                      top: 149.5 * scale,
                      left: width/2 - 415.7 * scale
                    }}
                >
                  <img 
                    src={process.env.PUBLIC_URL + "/taxi.png"} 
                    alt="_'s for the streets" 
                    className="taxi-btn"
                    style={{
                      width: 159.5 * scale
                    }}
                  />
                </button>

                {dgHover && (<img 
                  src={process.env.PUBLIC_URL + "/doppelgangers.png"} 
                  alt="_'s for the streets" 
                  className="w-16 h-16 hover:scale-110 transition-transform"
                  style={{
                    position: 'absolute',
                    top: 60.1 * scale,
                    left: width/2- 628.7 * scale,
                    height: 109.5 * scale,
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />)}
              </div>
            </Draggable>

            {/* <Draggable 
              cancel={dragEnabled ? "" : ".draggable-btn"}
              nodeRef={nodeRef}
              bounds={{ left: -180.75 * scale, top: 0, right: 440.5 * scale, bottom: 360 * scale }}
            >       
              <div className="draggable-btn"
                  ref={nodeRef}
              >
                <button className={`draggable-btn ${dragEnabled ? "drag-active" : ""}`}
                        onDoubleClick={openDict["openVroom"]} 
                        onMouseEnter={() => setLidarHover(true)}
                        onMouseLeave={() => setLidarHover(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          zIndex: 2,
                          position: 'absolute',
                          top: 149.5 * scale,
                          left: width/2 - 236 * scale
                        }}
                >
                  <img 
                    src={process.env.PUBLIC_URL + "/racecar.png"} 
                    alt="vroom vroom" 
                    className="racecar-btn"
                    style={{
                      width: 159.5 * scale
                    }}
                  />
                </button>

                {lidarHover && (<img 
                  src={process.env.PUBLIC_URL + "/lidar.png"} 
                  alt="_'s for the streets" 
                  className="w-16 h-16 hover:scale-110 transition-transform"
                  style={{
                    position: 'absolute',
                    top: 60.1 * scale,
                    left: width/2- 359 * scale,
                    height: 109.5 * scale,
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />)}
              </div>
            </Draggable> */}

            <Draggable 
              cancel={dragEnabled ? "" : ".draggable-btn"}
              nodeRef={nodeRef}
              bounds={{ left: -180.75 * scale, top: 0, right: 440.5 * scale, bottom: 360 * scale }}
            >       
              <div className="draggable-btn"
                  ref={nodeRef}
              >
                <button className={`draggable-btn ${dragEnabled ? "drag-active" : ""}`}
                        onDoubleClick={openDict["openPaint"]} 
                        onMouseEnter={() => setPaintHover(true)}
                        onMouseLeave={() => setPaintHover(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          zIndex: 3,
                          position: 'absolute',
                          top: 149.5 * scale,
                          left: width/2 - 236 * scale
                        }}
                >
                  <img 
                    src={process.env.PUBLIC_URL + "/racecar.png"} 
                    alt="paint" 
                    className="paint-btn"
                    style={{
                      width: 159.5 * scale
                    }}
                  />
                </button>

                {paintHover && (<img 
                  src={process.env.PUBLIC_URL + "/lidar.png"} 
                  alt="_'s for the streets" 
                  className="w-16 h-16 hover:scale-110 transition-transform"
                  style={{
                    position: 'absolute',
                    top: 60.1 * scale,
                    left: width/2- 359 * scale,
                    height: 109.5 * scale,
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />)}
              </div>
            </Draggable>

            
          </div>)}

          {/* Projects in the portfolio will be displayed like popup browsers that are draggable.
              Projects are linked to separate pages, and [popup] = returned components in draggable widget format. 
              IDEAS:
              - When on the home page, which is App component: an "About Me" popup will appear.
              - All popups, when in minimal mode, are Draggable within the pixel computer's screen boundaries.
              - Users are given the option to expand popups to full screen, or exit out of popups:
                If users were in a project popup (not App), then exiting returns to home page (App)
                If users exit out of "About Me" popup, they can access app links to projects, or reopen "About Me"
                by clicking profile icon (not implemented yet).*/}
          {popup != undefined && (<Draggable
            nodeRef={nodeRef}
            bounds={{ left: 0, top: 0, right: 620, bottom: 360 }}
            handle=".drag-handle" 
          >
            <div className="popup browser" 
              ref={nodeRef}
            >
              {/* popup handle to drag */}
              <div className="drag-handle cursor-move"
                  style={{padding: 10, background: "#4C4444"}}></div>

              {/* popup content (not draggable) */}
              <div className="popup content">{popup}</div>
            </div>
          </Draggable>)}

        </div>

        <button className="control-btn"
            onClick={handleCtrl} 
            style={{
              background: 'none',
              border: 'none'
            }}
        >
          {dragEnabled && (<img 
              src={process.env.PUBLIC_URL + "/narwhal.png"} 
              alt="narwhal" 
              className="narwhal"
              style={{
                width: 159.5 * scale
              }}
            />)
          }

          {!dragEnabled && (<img 
              src={process.env.PUBLIC_URL + "/favicon.ico"} 
              alt="childe" 
              className="childe"
              style={{
                width: 159.5 * scale
              }}
            />)
          }
        </button>

      </Stack>

    </div>
  );
}

export default App;