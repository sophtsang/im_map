import Draggable from "react-draggable";
import { useState } from 'react';

export default function DopplApp({nodeRef, open, dragEnabled, screenWidth, width}) {
    const taxiWidth = 16;
    const dopplBannerWidth = 59;
    const [dgHover, setDGHover] = useState(false);

    return (<Draggable
                cancel={dragEnabled ? "" : ".draggable-btn"}
                nodeRef={nodeRef}
                bounds={{ 
                    left: 0, top: -(taxiWidth - 13) * (width / screenWidth),
                    right: width - (taxiWidth + 6.5) * (width / screenWidth), 
                    bottom: width - (taxiWidth + 30) * (width / screenWidth) 
                }}
            >       
                <div className="draggable" ref={nodeRef}>
                    <button 
                        className={`draggable-btn ${dragEnabled ? "drag-active" : ""}`}
                        onDoubleClick={() => open("streets")}
                        onMouseEnter={() => setDGHover(true)}
                        onMouseLeave={() => setDGHover(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            zIndex: 2,
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
                            zIndex: 3
                        }}
                    />)}
                </div>
            </Draggable>)
}