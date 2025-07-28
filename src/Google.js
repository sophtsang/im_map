/* global google */
import React, { useState, useEffect, useCallback, use } from 'react';
// import { Polyline } from '@react-google-maps/api';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';

function Polyline({ distancePoints }) {
  const map = useMap();
  
  useEffect(() => {
    const polyline_back = new google.maps.Polyline({
        path: distancePoints,
        geodesic: true,
        strokeColor: "#4C4444",
        strokeWeight: 12,
        map: map, // Assign the polyline to the map
      });

    const polyline = new google.maps.Polyline({
        path: distancePoints,
        geodesic: true,
        strokeColor: "#BEB9B9",
        strokeWeight: 5,
        map: map, // Assign the polyline to the map
      });

    return () => {
      polyline_back.setMap(null);
      polyline.setMap(null);
    }
  }, [map, distancePoints]);

  return null;
}

const Map3D = ({ lat, lng, zoom = 14, apiKey, markers }) => {
  const position = { lat: lat, lng: lng };
  const [open, setOpen] = React.useState(false); // State for InfoWindow
  const [window, setWindow] = React.useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: lat, lng: lng })
  const [mapZoom, setMapZoom] = useState(zoom);
  const [markerIcon, setMarkerIcon] = useState("📷");
  const [dist, setDist] = useState(null);
  const [distMarker, setDistMarker] = useState([]);

//   TODAY 6/27/2025: I HAVE BEEN HONKED AT BY THE SAME CAR 2 TIMES
  useEffect(() => {
    if (distMarker.length == 2) {
        getDistance(distMarker);
    }
  }, [distMarker]);

  const handleMarkerClick = (name, lat, lng, images, event) => {
    if (event.domEvent.ctrlKey) {
        if (distMarker.length === 0) {
            setDistMarker([{ lat: lat, lng: lng }]);
            setDist(null);
        } else {
            setDistMarker([{ lat: lat, lng: lng }, distMarker[0]]);
        }
    } else {
        setWindow({ name, lat, lng, images });
        setOpen(true);
        setDistMarker([]);
    }
  };

  const getDistance = async (distancePoints) => {
    try {
        const response = await fetch('http://127.0.0.1:5000/get_distance', { 
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({ distancePoints: distancePoints }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Something went wrong on the server.');
        }

        const data = await response.json();
        setDist(data.distance)

    } catch (err) {
        console.log(err.message)
    }
  };

  useEffect(() => {
    if (lat !== 0 || lng !== 0) { // If user input is provided
      setMapCenter({ lat: lat, lng: lng });
      setMapZoom(14); // Reset zoom to a reasonable level when jumping to a new location
    } else if (markers && Object.keys(markers).length > 0) {
      setMapCenter({
        lat: markers[Object.keys(markers)[0]].lat,
        lng: markers[Object.keys(markers)[0]].lng,
      });
      setMapZoom(10);
    } else {
      setMapCenter({ lat: 0, lng: 0 });
      setMapZoom(10);
    }
  }, [lat, lng, markers]);

  const onCameraChanged = useCallback((map) => {
    if (map) {
      setMapCenter(map.detail.center);
      setMapZoom(map.detail.zoom);
    }
  }, []);

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        center={mapCenter}
        defaultZoom={mapZoom}
        onCameraChanged={onCameraChanged}
        mapId={"YOUR_MAP_ID"}
        style={{ width: '100%', height: '1000px' }}
      >

        <Polyline
            distancePoints = {distMarker}
        />

        {/* Doppelganger markers */}
        {markers &&
        Object.entries(markers).map(([name, details]) => (
            <AdvancedMarker
            key={name}
            position={{ lat: details.lat, lng: details.lng }}
            title={name}
            onClick={(event) =>
                handleMarkerClick(name, details.lat, details.lng, details.images, event)
            }
            >
            {/* Custom icon for doppelganger marker (e.g., a person emoji) */}
            <span style={{ fontSize: '30px' }}>{markerIcon}</span>
            </AdvancedMarker>
        ))}

        {open && (
          <InfoWindow position={{ lat: window.lat, lng: window.lng }} 
                      onCloseClick={() => setOpen(false)}
                      pixelOffset={[0,-25]}>
            <div>
                <p style={{ fontFamily: "Pixelify Sans", 
                            margin: '10px 0 5px',
                            color: '#3E3333',
                            fontSize: 18}}>
                    lat: <span style={{
                        color: "#948D8D"
                    }}>{window.lat}</span>, 
                    lng: <span style={{
                        color: "#948D8D"
                    }}>{window.lng}</span></p>
                <div style={{
                        display: 'block',
                        flexWrap: 'wrap',
                        gap: '5px',
                        justifyContent: 'center',
                    }}></div>
                {window.images.map((imagePath, index) => (
                    <img 
                        key={index}
                        src={process.env.PUBLIC_URL + imagePath} 
                        style={{ width: '375px',
                                 display: 'block',
                                 marginTop: 25,
                                 marginBottom: 25,
                                 marginRight: 'auto',
                                 marginLeft: 'auto' }} 
                    />
                ))}
            </div>
          </InfoWindow>
        )}
      </Map>
      {distMarker.length == 2 && dist != null && 
        <p style={{ marginTop: '20px', 
                    color: "#4C4444",
                    fontSize: 24 }}>distance between lat: 
        <span style={{color: "#948D8D"}}> {distMarker[0].lat.toFixed(4)}</span>, 
        lng: 
        <span style={{color: "#948D8D"}}> {distMarker[0].lng.toFixed(4)} </span>
        and lat: 
        <span style={{color: "#948D8D"}}> {distMarker[1].lat.toFixed(4)}</span>, 
        lng: 
        <span style={{color: "#948D8D"}}> {distMarker[1].lng.toFixed(4)} </span>
        is 
        <span style={{color: "#948D8D"}}> {dist.toFixed(4)} meters</span>
        </p>
      }
    </APIProvider>
  );
};

export default Map3D;

