import Draggable from "react-draggable";
import { useState } from 'react';

export default function TermApp({nodeRef, open, dragEnabled, screenWidth, width}) {
    const termWidth = 16;
    const termBannerWidth = 41;
    const [termHover, setTermHover] = useState(false);

    return (<Draggable 
                cancel={dragEnabled ? "" : ".draggable-btn"}
                nodeRef={nodeRef}
                bounds={{ 
                    left: 0, 
                    top: -(termWidth) * (width / screenWidth), 
                    right: width - (termWidth + 6.5) * (width / screenWidth), 
                    bottom: width - (termWidth + 45) * (width / screenWidth) 
                }}
            >        
                <div className="draggable-btn" ref={nodeRef}>
                    <button className={`draggable-btn ${dragEnabled ? "drag-active" : ""}`}
                        onDoubleClick={() => open("terminal")}
                        onMouseEnter={() => setTermHover(true)}
                        onMouseLeave={() => setTermHover(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            zIndex: 2,
                            position: 'absolute',
                            top: 18 * (width / screenWidth),
                            left: 3 * (width / screenWidth)
                        }}
                    >
                        <img 
                            src={process.env.PUBLIC_URL + "/assets/terminal.png"} 
                            alt="terminal" 
                            className="terminal-btn"
                            style={{
                                width: width * termWidth / screenWidth
                            }}
                        />
                </button>
                
                {termHover && (<img 
                  src={process.env.PUBLIC_URL + "/assets/term_hover.png"} 
                  alt="terminal hover" 
                  className="w-16 h-16 transition-transform"
                  style={{
                    position: 'absolute',
                    top: 8 * (width / screenWidth),
                    left: -9 * (width / screenWidth),
                    width: width * termBannerWidth / screenWidth,
                    pointerEvents: 'none',
                    zIndex: 3
                  }}
                />)}
            </div>
        </Draggable>)
}