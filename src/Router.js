import { Routes, Route, useNavigate } from "react-router-dom";
import Lidar from "./Lidar";
import GetData from "./apps/doppelganger/GetData";
// import Paint from "../ignore/painter/Paint";
import App from "./App";
import Truck from "./apps/truck/Truck";

function Router() {
  const navigate = useNavigate();

  const openVroom = () => {
    navigate("/lidar");
  };

  const openStreets = () => {
    navigate("/streets");
  };

  // const openPaint = () => {
  //   navigate("/paint");
  // }

  const handleMarker = (data) => {
    if (data.location_data) {
      console.log("Marker received:", data);
    }
  };

  return (
    <Routes>
        <Route path="/kernel_bsod" element={<App enableUI={true} animate={true}/>} />
        <Route path="/lidar" element={<Truck />} />
        <Route path="/streets" element={
          <GetData onDataLoaded={handleMarker}/>} />
    </Routes>
  );
}

export default Router;