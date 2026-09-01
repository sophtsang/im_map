import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './GetData.css';
import Colmap from './Colmap';
import Draggable from "react-draggable";
import App from '../App';

function GetData({ onDataLoaded }) {
    const nodeRef = useRef(null);
    const [directoryPath, setDirectoryPath] = useState('Alexander_Nevsky_Cathedral,_Sofia');
    const [folderNames, setFolderNames] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [suggestion, setSuggestion] = useState({suggestions: [''], index: 0});
    const containerRef = useRef(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [heading, setHeading] = useState(0);

    useEffect(() => {
        setInitialLoad(false);
    }, []);

    // Track the popup's own rendered width (not window.innerWidth) since the
    // popup is nested inside a scaled "computer screen" frame that doesn't
    // track the window size 1:1 — using window width here caused the search
    // bar to drift off-center and overflow on resize.
    useLayoutEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.clientWidth);
                setHeight(containerRef.current.clientHeight);
            }
        };

        updateWidth();

        const resizeObserver = new ResizeObserver(updateWidth);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener('resize', updateWidth);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateWidth);
        };
    }, []);

    const handleKeyPress = (event) => {
        const index = suggestion.index
        const suggestions = suggestion.suggestions
        const curr = suggestion.curr
        if (event.key === "Tab") {
            setDirectoryPath(curr[index] + suggestions[index])
            setSuggestion({suggestions: [''], index: 0})
        }

        if (event.key === "Enter") {
            listFolders()
        }

        if (event.key === "ArrowDown") {
            setSuggestion({suggestions: suggestions, index: (index + 1) % suggestions.length })
        }
    }
    
    const handleInputChange = async (event) => {
        setDirectoryPath(event.target.value);
        try {
            console.log(event.target.value)
            
            const response = await fetch('https://im-map.onrender.com/autocomplete', { 
            // const response = await fetch('http://127.0.0.1:5000/autocomplete', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path: event.target.value }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Something went wrong on the server.');
            }

            const data = await response.json();
            setSuggestion(data)
        } catch (err) {
            setError(err.message);
        }
    };

    const listFolders = async () => {
        setError(null);
        setLoading(true);
        setFolderNames([]); 

        try {
            const response = await fetch('https://im-map.onrender.com/get_markers', { 
            // const response = await fetch('http://127.0.0.1:5000/get_markers', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path: directoryPath }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Something went wrong on the server.');
            }

            const data = await response.json();

            onDataLoaded(data);
            setFolderNames(data.doppelgangers_data);
        } catch (err) {
            setError(err.message);
            onDataLoaded({});
        } finally {
            setLoading(false);
        }
    };

    return (
        <App enableUI={false} responsivePopup popup={
            <Draggable
                cancel={".draggable-btn"}
                nodeRef={containerRef}
                bounds={{ left: 0, top: 0, right: width + 140, bottom: height - 530}}
            >       
                          
            <div ref={containerRef} style={{   
                width: 1000,
                padding: 2, 
                fontFamily: 'Pixelify Sans',
                position: 'relative',
                display: 'inline-block'
            }}>
            
              {/* style={{   width: '100%', */}
            {/* //                 maxWidth: '100%',
            //                 boxSizing: 'border-box',
            //                 padding: 2,
            //                 background: '#E8E6E5',
            //                 fontFamily: 'Pixelify Sans'
            //             }}> */}

                <img 
                    className="lidar_window"
                    src={process.env.PUBLIC_URL + "/assets/window_lidar.png"} 
                    style={{
                        zIndex: 0,
                        position: 'absolute',
                        width: '100%',
                        display: 'block',
                        left: 0,
                    }}
                />

                {/* <h2 className="street-h2">_'s for the streets</h2> */}

                {/* <div style={{ 
                    position: 'relative', 
                    width: '100%', 
                    maxWidth: '100%', 
                    height: 'auto' }}> */}
                <div className="street-h2"
                    style={{ 
                        position: 'relative',
                        zIndex: 1,
                        transform: 'translate(-15%, 50%)',
                        alignItems: 'center',
                    }}>
                    <input
                        type="text"
                        value={directoryPath}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        placeholder="Alexander_Nevsky_Cathedral,_Sofia"
                        className="street-input"
                        style={{width: '500px', 
                                // padding: '8px', 
                                fontFamily: 'Pixelify Sans',
                                fontSize: 32,
                                color: "#4C4444",
                                backgroundColor: 'transparent',
                                border: 'none',
                                outline: 'none',
                                zIndex: 1,
                                position: 'absolute',
                                top: 20,
                                left: width/2-220}}
                    />
                    <input
                        type="text"
                        readOnly
                        value={suggestion.suggestions[0] !== "" ? directoryPath + suggestion.suggestions[suggestion.index] : ""}
                        style={{position: 'absolute',
                                top: 20,
                                left: width/2-220,
                                width: '500px',
                                // padding: '8px',
                                fontFamily: 'Pixelify Sans',
                                fontSize: 32,
                                backgroundColor: 'transparent',
                                color: '#948D8D',
                                border: 'none',
                                outline: 'none',
                                zIndex: 0,
                                pointerEvents: 'none',
                                whiteSpace: 'pre',
                                textAlign: 'left' }}>
                    </input>  

                    <button onClick={listFolders} 
                            disabled={loading} 
                            style={{padding: 0,
                                    cursor: 'pointer',
                                    marginLeft: width/2+320,
                                    marginBottom: '25px',
                                    background: 'none',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center' }}>
                        <img 
                            src={process.env.PUBLIC_URL + "/assets/favicon.ico"} 
                            style={{ 
                                    width: '70px',
                                    transform: 'rotate(' + heading + 'deg)'
                            }} 
                        />
                    </button>
                </div>

                {/* {error && <p style={{ color: '#948D8D' }}>Error: {error}</p>} */}

                {folderNames.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                    <h3>Folders:</h3>
                    <ul>
                        {folderNames.map((folder, index) => (
                        <li key={index}>{folder}</li>
                        ))}
                    </ul>
                    </div>
                )}

                {/* {!loading && !error && folderNames.length === 0 && directoryPath && (
                    <p style={{ marginTop: '20px', color: "#948D8D" }}>No folders found in the specified path.</p>
                )} */}

                <Colmap 
                    onDirectoryChange={{"location": directoryPath, "click": loading || initialLoad }}
                    onHeadingChange={setHeading}
                />

            </div>
            </Draggable>}
            animate={false}
        />

    );
}

export default GetData;