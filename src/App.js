import { useState, useEffect, useRef  } from 'react';
import { Navigate, useNavigate } from "react-router-dom";
import './App.css';
import Draggable from "react-draggable";
import Stack from '@mui/material/Stack'

function App({ openVroom, openStreets, enableUI, popup } ) {
  const nodeRef = useRef(null);
  const [lidarHover, setLidarHover] = useState(false);
  const [dgHover, setDGHover] = useState(false);
  const navigate = useNavigate();
  const [inputLat, setInputLat] = useState('40.7887');
  const [inputLng, setInputLng] = useState('-73.9862');

  // const [mapLat, setMapLat] = useState(40.7887);
  // const [mapLng, setMapLng] = useState(-73.9862);
  
  // const [marker, setMarker] = useState(null);

  const {width, height} = useWindowSize();

  function useWindowSize() {
      const [windowSize, setWindowSize] = useState({
          width: window.innerWidth,
          height: window.innerHeight,
      });

      useEffect(() => {
          const handleResize = () => {
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

  // const handleLatChange = (event) => {
  //   setInputLat(event.target.value);
  // };

  // const handleLngChange = (event) => {
  //   setInputLng(event.target.value);
  // }

  // const handleSubmit = (event) => {
  //   event.preventDefault(); // Prevent default form submission behavior (page reload)

  //   const newLat = parseFloat(inputLat);
  //   const newLng = parseFloat(inputLng);

  //   // Basic validation
  //   if (isNaN(newLat) || isNaN(newLng) || newLat < -90 || newLat > 90 || newLng < -180 || newLng > 180) {
  //     alert('Please enter valid latitude (-90 to 90) and longitude (-180 to 180).');
  //     return;
  //   }

  //   setMapLat(newLat);
  //   setMapLng(newLng);
  // };

  // const handleMarker = (data) => {
  //   if (data.location_data) {
  //     setMapLat(data.location_data.lat);
  //     setMapLng(data.location_data.lng);
  //     setMarker(data.doppelgangers_data);
  //   }
  // }

  useEffect(() => {
    document.title = "meow";
  }, []);

  return (
    <div className="App">
      {/* <h1 className="map-title">i'm map?</h1> */}

      {/* <section style={{ marginBottom: '40px', 
                        padding: '10px', 
                        border: 'none'
                      }}>
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px',
                                               color: '#3E3333'
                                              }}>
          <label htmlFor="latInput">lat:</label>
          <input
            type="text"
            id="latInput"
            value={inputLat}
            onChange={handleLatChange}
            placeholder="40.7557"
            style={{width: 150,
                    marginRight: '10px', 
                    padding: '8px', 
                    border: 'none',
                    fontFamily: 'Pixelify Sans',
                    fontSize: '24px',
                    color: "#948D8D",
                    outline: 'none'
                  }}
          />

          <label htmlFor="lngInput">lng: </label>
          <input
            type="text"
            id="lngInput"
            value={inputLng}
            onChange={handleLngChange}
            placeholder="-73.9562"
            style={{width: 150,
                    marginRight: '10px', 
                    padding: '8px', 
                    border: 'none',
                    fontFamily: 'Pixelify Sans',
                    fontSize: '24px',
                    color: "#948D8D",
                    outline: 'none'
                  }}
          />

          <button type="submit" 
                  style={{padding: '8px 15px', 
                          cursor: 'pointer',
                          fontFamily: "LanaPixel",
                          fontSize: '24px',
                          border: 'none',
                          color: '#3E3333',
                          background: 'none' }}>
            <span className="teleportation-button">传送</span>
          </button>
        </form>
      </section> */}

      {/* {googleMapsApiKey ? (
        <Map3D 
          lat={mapLat} 
          lng={mapLng}
          apiKey={googleMapsApiKey}
          zoom={20}
          markers={marker} />
      ) : (
        <p>Google Maps API Key is missing. Please set REACT_APP_Maps_API_KEY in your .env file.</p>
      )} */}

      <Stack 
        direction="row"
        sx={{ 
            alignItems: 'center',
            mb: 140
        }}
      >
        <div className="computer screen"
            style={{ 
                position: 'relative',
            }}
        > 
          <img 
            src={process.env.PUBLIC_URL + "/computer.png"} 
            alt="computer" 
            className="w-full h-full object-cover rounded-xl shadow-lg" 
            style={{
              zIndex: 0,
              position: 'absolute',
              width: 1520,
              left: width/2 - 760
            }}
          />

          {enableUI && (<div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-transparent z-10">
            <Draggable 
              nodeRef={nodeRef}
              bounds={{ left: 0, top: 0, right: 620, bottom: 360 }}>       
              <div className="absolute cursor-pointer"
                  ref={nodeRef}
              >
                <button 
                  className="absolute top-[30%] left-[25%]"
                  onDoubleClick={openStreets}
                  onMouseEnter={() => setDGHover(true)}
                  onMouseLeave={() => setDGHover(false)}
                  style={{
                      background: 'none',
                      border: 'none',
                      zIndex: 1,
                      position: 'absolute',
                      top: 149.5,
                      left: width/2 - 415.7
                    }}
                >
                  <img 
                    src={process.env.PUBLIC_URL + "/taxi.png"} 
                    alt="_'s for the streets" 
                    className="w-16 h-16 hover:scale-110 transition-transform"
                    style={{
                      width: 159.5
                    }}
                  />
                </button>

                {dgHover && (<img 
                  src={process.env.PUBLIC_URL + "/doppelgangers.png"} 
                  alt="_'s for the streets" 
                  className="w-16 h-16 hover:scale-110 transition-transform"
                  style={{
                    position: 'absolute',
                    top: 60.1,
                    left: width/2-628.7,
                    height: 109.5,
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />)}
              </div>
            </Draggable>

            <Draggable 
              nodeRef={nodeRef}
              bounds={{ left: -180.75, top: 0, right: 440.5, bottom: 360 }}
            >       
              <div className="absolute cursor-pointer"
                  ref={nodeRef}
              >
                <button className="absolute top-[30%] left-[55%]"
                        onDoubleClick={openVroom} 
                        onMouseEnter={() => setLidarHover(true)}
                        onMouseLeave={() => setLidarHover(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          zIndex: 2,
                          position: 'absolute',
                          top: 149.5,
                          left: width/2 - 236
                        }}
                >
                  <img 
                    src={process.env.PUBLIC_URL + "/racecar.png"} 
                    alt="vroom vroom" 
                    className="w-16 h-16 hover:scale-110 transition-transform"
                    style={{
                      width: 159.5
                    }}
                  />
                </button>

                {lidarHover && (<img 
                  src={process.env.PUBLIC_URL + "/lidar.png"} 
                  alt="_'s for the streets" 
                  className="w-16 h-16 hover:scale-110 transition-transform"
                  style={{
                    position: 'absolute',
                    top: 60.1,
                    left: width/2-359,
                    height: 109.5,
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
            <div className="popup browser" ref={nodeRef}>
              {/* popup handle to drag */}
              <div className="drag-handle cursor-move"
                  style={{padding: 10, background: "#4C4444"}}></div>

              {/* popup content (not draggable) */}
              <div className="popup content">{popup}</div>
            </div>
          </Draggable>)}

        </div>

      </Stack>

    </div>
  );
}

export default App;