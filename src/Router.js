import { Routes, Route, useNavigate } from "react-router-dom";
import Lidar from "./Lidar";
import GetData from "./GetData";
import App from "./App";

function Router() {
  const navigate = useNavigate();

  const openVroom = () => {
    navigate("/lidar");
  };

  const openStreets = () => {
    navigate("/streets");
  };

  const handleMarker = (data) => {
    if (data.location_data) {
      console.log("Marker received:", data);
    }
  };

  return (
    <Routes>
        <Route path="/" element={<App openVroom={openVroom} openStreets={openStreets} enableUI={true} />} />
        <Route path="/lidar" element={<Lidar />} />
        <Route path="/streets" element={<GetData onDataLoaded={handleMarker}/>} />
    </Routes>
  );
}

export default Router;