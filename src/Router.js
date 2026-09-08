import { Routes, Route, useNavigate } from "react-router-dom";
import Lidar from "./Lidar";
import GetData from "./doppelganger/GetData";
import Paint from "./painter/Paint";
import App from "./App";

function Router() {
  const navigate = useNavigate();

  const openVroom = () => {
    navigate("/lidar");
  };

  const openStreets = () => {
    navigate("/streets");
  };

  const openPaint = () => {
    navigate("/");
  }

  const handleMarker = (data) => {
    if (data.location_data) {
      console.log("Marker received:", data);
    }
  };

  return (
    <Routes>
        <Route path="/im_map" element={<App openDict={
            {"openVroom": openVroom, "openStreets": openStreets, "openPaint": openPaint}
          } enableUI={true} animate={true}/>} />
        <Route path="/lidar" element={<Lidar />} />
        <Route path="/" element={<Paint />} />
        <Route path="/streets" element={
          <GetData onDataLoaded={handleMarker}/>} />
    </Routes>
  );
}

export default Router;