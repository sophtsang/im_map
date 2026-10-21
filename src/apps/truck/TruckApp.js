import Draggable from "react-draggable";
import { useState } from 'react';

export default function TruckApp({nodeRef, open, dragEnabled, screenWidth, width}) {
    const raceCarWidth = 16;
    const lidarBannerWidth = 41;
    const [lidarHover, setLidarHover] = useState(false);

    return (<Draggable 
                cancel={dragEnabled ? "" : ".draggable-btn"}
                nodeRef={nodeRef}
                bounds={{ 
                    left: -(raceCarWidth + 1) * (width / screenWidth), 
                    top: -(raceCarWidth - 13) * (width / screenWidth), 
                    right: width - (raceCarWidth + 25.5) * (width / screenWidth), 
                    bottom: width - (raceCarWidth + 30) * (width / screenWidth) 
                }}
            >        
                <div className="draggable-btn" ref={nodeRef}>
                    <button className={`draggable-btn ${dragEnabled ? "drag-active" : ""}`}
                        onDoubleClick={() => open("truck")}
                        onMouseEnter={() => setLidarHover(true)}
                        onMouseLeave={() => setLidarHover(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            zIndex: 2,
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
                            zIndex: 3
                        }}
                    />)}
                </div>
            </Draggable>)
}