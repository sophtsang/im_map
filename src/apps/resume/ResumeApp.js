import Draggable from "react-draggable";
import { useState } from 'react';

export default function ResumeApp({nodeRef, open, dragEnabled, screenWidth, width}) {
    const resumeWidth = 16;
    // const resumeBannerWidth = 59;
    const [resumeHover, setResumeHover] = useState(false);

    return (<Draggable
                cancel={dragEnabled ? "" : ".draggable-btn"}
                nodeRef={nodeRef}
                bounds={{ 
                    left: -(resumeWidth + 2) * (width / screenWidth), 
                    top: -(resumeWidth + 15) * (width / screenWidth),
                    right: width - (resumeWidth + 24.5) * (width / screenWidth), 
                    bottom: width - (resumeWidth + 62) * (width / screenWidth) 
                }}
            >       
                <div className="draggable" ref={nodeRef}>
                    <button 
                        className={`draggable-btn ${dragEnabled ? "drag-active" : ""}`}
                        onDoubleClick={() => open("resume")}
                        // onMouseEnter={() => setDGHover(true)}
                        // onMouseLeave={() => setDGHover(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            zIndex: 2,
                            position: 'absolute',
                            top: 34 * (width / screenWidth),
                            left: 21 * (width / screenWidth)
                        }}
                    >
                        <img 
                            src={process.env.PUBLIC_URL + "/assets/pdf.png"} 
                            alt="resume" 
                            className="resume-btn"
                            style={{
                                width: width * resumeWidth / screenWidth
                            }}
                        />
                    </button>

                    {/* {dgHover && (<img 
                        src={process.env.PUBLIC_URL + "/assets/doppelgangers.png"} 
                        alt="_'s for the streets" 
                        className="w-16 h-16 transition-transform"
                        style={{
                            position: 'absolute',
                            top: -5 * (width / screenWidth),
                            left: -18 * (width / screenWidth),
                            width: width * ResumeBannerWidth / screenWidth,
                            pointerEvents: 'none',
                            zIndex: 3
                        }}
                    />)} */}
                </div>
            </Draggable>)
}