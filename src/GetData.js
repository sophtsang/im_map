import { useEffect, useState } from 'react';
import './GetData.css';
import Colmap from './Colmap';
import App from './App';

function GetData({ onDataLoaded }) {
    const [directoryPath, setDirectoryPath] = useState('Alexander_Nevsky_Cathedral,_Sofia');
    const [folderNames, setFolderNames] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState({suggestions: [''], index: 0});
    const {width, height} = useWindowSize();
    const [heading, setHeading] = useState(0);

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
        }, []);

        return windowSize;
    }

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
        <App enableUI={false} popup={
            <div style={{   padding: 2, 
                            background: '#E8E6E5', 
                            fontFamily: 'Pixelify Sans'
                        }}>
                <h2 className="street-h2">_'s for the streets</h2>
                
                <div style={{ position: 'relative', width: width-500, height: 'auto' }}>
                    <input
                        type="text"
                        value={directoryPath}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        placeholder="Alexander_Nevsky_Cathedral,_Sofia"
                        className="street-input"
                        style={{width: '300px', 
                                padding: '8px', 
                                fontFamily: 'Pixelify Sans',
                                fontSize: 24,
                                color: "#948D8D",
                                backgroundColor: 'transparent',
                                border: 'none',
                                outline: 'none',
                                zIndex: 1,
                                position: 'absolute',
                                top: 20,
                                left: (width-500)/2-220}}
                    />
                    <input
                        type="text"
                        readOnly
                        value={suggestion.suggestions[0] !== "" ? directoryPath + suggestion.suggestions[suggestion.index] : ""}
                        style={{position: 'absolute',
                                top: 20,
                                left: (width-500)/2-220,
                                width: '300px',
                                padding: '8px',
                                fontFamily: 'Pixelify Sans',
                                fontSize: 24,
                                backgroundColor: 'white',
                                color: '#BEBABA',
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
                                    marginLeft: (width-500)/2+120,
                                    marginBottom: '25px',
                                    background: 'none',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center' }}>
                        <img 
                            src={process.env.PUBLIC_URL + "/favicon.ico"} 
                            style={{ 
                                    width: '80px',
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

                {!loading && !error && folderNames.length === 0 && directoryPath && (
                    <p style={{ marginTop: '20px', color: "#948D8D" }}>No folders found in the specified path.</p>
                )}
            
                <Colmap 
                    onDirectoryChange={{"location": directoryPath, "click": loading}}
                    onHeadingChange={setHeading}
                />

            </div>}
        />

    );
}

export default GetData;