import React, { useState, useEffect } from 'react';
import Map3D from './Google'; // Adjust path if needed
import GetData from './GetData';
import './App.css'; // Optional: for basic styling

function App() {
  const [inputLat, setInputLat] = useState('40.7887');
  const [inputLng, setInputLng] = useState('-73.9862');
  const googleMapsApiKey = ; // Replace with your actual API Key

  const [mapLat, setMapLat] = useState(40.7887);
  const [mapLng, setMapLng] = useState(-73.9862);

  const [marker, setMarker] = useState(null);

  const handleLatChange = (event) => {
    setInputLat(event.target.value);
  };

  const handleLngChange = (event) => {
    setInputLng(event.target.value);
  }

  const handleSubmit = (event) => {
    event.preventDefault(); // Prevent default form submission behavior (page reload)

    const newLat = parseFloat(inputLat);
    const newLng = parseFloat(inputLng);

    // Basic validation
    if (isNaN(newLat) || isNaN(newLng) || newLat < -90 || newLat > 90 || newLng < -180 || newLng > 180) {
      alert('Please enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    setMapLat(newLat);
    setMapLng(newLng);
  };

  const handleMarker = (data) => {
    if (data.location_data) {
      setMapLat(data.location_data.lat);
      setMapLng(data.location_data.lng);
      setMarker(data.doppelgangers_data);
    }
  }

  useEffect(() => {
    document.title = "meow";
  }, []);

  return (
    <div className="App">
      <h1 className="map-title">i'm map?</h1>

      <section style={{ marginBottom: '40px', 
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
      </section>

      {googleMapsApiKey ? (
        <Map3D 
          lat={mapLat} 
          lng={mapLng}
          apiKey={googleMapsApiKey}
          zoom={20}
          markers={marker} />
      ) : (
        <p>Google Maps API Key is missing. Please set REACT_APP_Maps_API_KEY in your .env file.</p>
      )}

      {/* Directory Lister Component */}
      <GetData onDataLoaded={handleMarker} />

    </div>
  );
}

export default App;