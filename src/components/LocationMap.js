import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaExchangeAlt, FaMapMarkerAlt, FaLocationArrow } from "react-icons/fa";
import { motion } from "framer-motion";
import "./styles.css";

const defaultStart = [51.505, -0.09]; 
const defaultEnd = [40.7128, -74.006]; 

const startIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  className: "start-marker"
});

const endIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "end-marker"
});

const popularCities = {
  "New York": [40.7128, -74.006],
  "London": [51.5074, -0.1278],
  "Tokyo": [35.6895, 139.6917],
  "Paris": [48.8566, 2.3522],
  "Dubai": [25.276987, 55.296249],
  "Sydney": [-33.8688, 151.2093],
  "Mumbai": [19.076, 72.8777]
};

export default function RoutePlanner() {
  const [startLocation, setStartLocation] = useState(defaultStart);
  const [endLocation, setEndLocation] = useState(defaultEnd);
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [route, setRoute] = useState([]);
  const [useLocationFor, setUseLocationFor] = useState(""); 
  const [distance, setDistance] = useState("...");
  const [travelTime, setTravelTime] = useState("...");

  useEffect(() => {
    if (useLocationFor && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          if (useLocationFor === "start") setStartLocation(coords);
          if (useLocationFor === "end") setEndLocation(coords);
        },
        () => console.log("Location access denied.")
      );
    }
  }, [useLocationFor]);

  const getCoordinates = async (place, setFunction) => {
    if (!place) return;
    if (popularCities[place]) {
      setFunction(popularCities[place]);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`);
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        setFunction([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  const calculateDistanceAndTime = useCallback(() => {
    if (startLocation && endLocation) {
      const R = 6371;
      const lat1 = (Math.PI * startLocation[0]) / 180;
      const lat2 = (Math.PI * endLocation[0]) / 180;
      const deltaLat = lat2 - lat1;
      const deltaLon = (Math.PI * (endLocation[1] - startLocation[1])) / 180;
      const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c;
      setDistance(`${d.toFixed(2)} km`);
      setTravelTime(`${(d / 50).toFixed(2)} hrs`);
      fetchRoute();
    }
  }, [startLocation, endLocation]);

  const fetchRoute = async () => {
    if (!startLocation || !endLocation) return;
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLocation[1]},${startLocation[0]};${endLocation[1]},${endLocation[0]}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.routes.length > 0) {
        setRoute(data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]));
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };

  const swapLocations = () => {
    setStartLocation(endLocation);
    setEndLocation(startLocation);
    setStartInput(endInput);
    setEndInput(startInput);
  };

  useEffect(() => {
    if (startLocation) {
      calculateDistanceAndTime();
    }
  }, [startLocation, endLocation, calculateDistanceAndTime]);

  return (
    <div className="route-planner">
      <motion.div className="sidebar" initial={{ x: -300 }} animate={{ x: 0 }} transition={{ duration: 0.5 }}>
        <h2>🚀 Road Router</h2>

        <div className="current-location-section">
          <h3><FaLocationArrow /> Use Current Location</h3>
          <div className="current-location-buttons">
            <button 
              className={useLocationFor === "start" ? "active" : ""} 
              onClick={() => setUseLocationFor("start")}
            >
              📍 Set as Start
            </button>
            <button 
              className={useLocationFor === "end" ? "active" : ""} 
              onClick={() => setUseLocationFor("end")}
            >
              🎯 Set as Destination
            </button>
            <button 
              className={useLocationFor === "" ? "active" : ""} 
              onClick={() => setUseLocationFor("")}
            >
              ❌ Clear
            </button>
          </div>
        </div>

        <div className="input-group">
          <FaMapMarkerAlt className="icon" />
          <select onChange={(e) => getCoordinates(e.target.value, setStartLocation)}>
            <option value="">Select Start City</option>
            {Object.keys(popularCities).map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <input type="text" placeholder="Start Location" value={startInput} onChange={(e) => setStartInput(e.target.value)} />
        </div>

        <button className="swap-btn" onClick={swapLocations}><FaExchangeAlt /></button>

        <div className="input-group">
          <FaMapMarkerAlt className="icon" />
          <select onChange={(e) => getCoordinates(e.target.value, setEndLocation)}>
            <option value="">Select Destination City</option>
            {Object.keys(popularCities).map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <input type="text" placeholder="Destination" value={endInput} onChange={(e) => setEndInput(e.target.value)} />
        </div>

        <button className="find-route-btn" onClick={calculateDistanceAndTime}>Find Route</button>

        <p>📏 Distance: {distance} | ⏳ Time: {travelTime}</p>
      </motion.div>

      <div className="map-section">
        {startLocation && (
          <MapContainer center={startLocation} zoom={5} className="map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={startLocation} icon={startIcon}><Popup>Start</Popup></Marker>
            <Marker position={endLocation} icon={endIcon}><Popup>Destination</Popup></Marker>
            {route.length > 0 && <Polyline positions={route} color="blue" />}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
