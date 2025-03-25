import React, { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchStations } from "../services/database";
import SearchComponent from "./SearchComponent";
import "./Map.css";

// Fix missing marker icons in Leaflet (Vite/Webpack issue)
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Function to determine AQI color
const getAQIColor = (aqi) => {
  if (aqi === "N/A") return "#A0A0A0"; // Grey for missing data
  const aqiValue = parseInt(aqi, 10);
  if (aqiValue <= 50) return "#009966"; // Green (Good)
  if (aqiValue <= 100) return "#FFDE33"; // Yellow (Moderate)
  if (aqiValue <= 150) return "#FF9933"; // Orange (Unhealthy for Sensitive Groups)
  if (aqiValue <= 200) return "#CC0033"; // Red (Unhealthy)
  if (aqiValue <= 300) return "#660099"; // Purple (Very Unhealthy)
  return "#7E0023"; // Maroon (Hazardous)
};

// Create popup content function for consistent popup styling
const createPopupContent = (station) => {
  const { station_name, aqi, co, no2, so2, o3, pm25, pm10 } = station;
  const aqiColor = getAQIColor(aqi);
  
  return `
    <div class="aqi-popup">
      <h3>${station_name}</h3>
      <p>
        <strong>Air Quality Index:</strong> 
        <span class="aqi-value" style="background-color:${aqiColor}; color:${parseInt(aqi, 10) > 150 ? 'white' : 'black'}">
          ${aqi}
        </span>
      </p>
      <div class="pollutants">
        <div class="pollutant-item">
          <span class="pollutant-label">CO</span>
          <span>${co}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">NO₂</span>
          <span>${no2}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">SO₂</span>
          <span>${so2}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">O₃</span>
          <span>${o3}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">PM2.5</span>
          <span>${pm25}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">PM10</span>
          <span>${pm10}</span>
        </div>
      </div>
    </div>
  `;
};

const Map = () => {
  const [stations, setStations] = useState([]);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [randomFact, setRandomFact] = useState(""); // State for random fact
  const [isLoading, setIsLoading] = useState(true); // State for loading status

  // Fetch random fact when component mounts
  useEffect(() => {
    async function fetchRandomFact() {
      try {
        const response = await fetch("http://localhost:8000/random_fact");
        const data = await response.json();
        setRandomFact(data.fact);
      } catch (error) {
        console.error("Error fetching random fact:", error);
        setRandomFact("Air pollution affects millions worldwide."); // Fallback fact
      }
    }
    fetchRandomFact();
  }, []);

  // Fetch stations and manage loading state
  useEffect(() => {
    async function loadStations() {
      setIsLoading(true); // Start loading
      try {
        const data = await fetchStations();
        console.log("Stations received in Map:", data);
        setStations(data);
      } catch (error) {
        console.error("Error fetching stations:", error);
      } finally {
        setIsLoading(false); // End loading
      }
    }
    loadStations();
  }, []);

  // Initialize map
  useEffect(() => {
    const newMap = L.map("map").setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(newMap);
    setMap(newMap);
    return () => newMap.remove();
  }, []);

  // Add markers when stations or map changes
  useEffect(() => {
    if (!map) return;

    // Clear old markers
    markers.forEach((marker) => map.removeLayer(marker));
    const newMarkers = [];

    stations.forEach(
      ({ latitude, longitude, station_name, aqi, co, no2, so2, o3, pm25, pm10 }) => {
        if (!latitude || !longitude) return;

        // Outer Ring (Sky Blue)
        const outerRing = L.circleMarker([latitude, longitude], {
          color: "#87CEEB",
          fillOpacity: 0,
          radius: 6,
          weight: 2,
        }).addTo(map);

        // Inner Dot (Dark Blue)
        const innerDot = L.circleMarker([latitude, longitude], {
          color: "#00008B",
          fillColor: "#00008B",
          fillOpacity: 1,
          radius: 2,
        }).addTo(map);

        // Hover effect: Show AQI with color
        const aqiColor = getAQIColor(aqi);
        innerDot.bindTooltip(
          `<div style="color: ${aqiColor}; font-weight: bold;">AQI: ${aqi}</div>`,
          {
            direction: "top",
            offset: [0, -10],
            className: "aqi-tooltip",
          }
        );

        // Click effect: Popup with animation
        innerDot.bindPopup(createPopupContent({
          station_name, aqi, co, no2, so2, o3, pm25, pm10
        }), {
          className: "custom-popup",
          offset: [0, -10],
        });

        newMarkers.push(outerRing, innerDot);
      }
    );

    setMarkers(newMarkers);
  }, [stations, map]);

  // Handle search & zoom to station
  const handleSearch = async (selectedStation) => {
    console.log("Zooming to:", selectedStation.latitude, selectedStation.longitude);
    if (!map) return;

    try {
      const response = await fetch(`http://localhost:8000/station/${selectedStation.id}`);
      const data = await response.json();

      if (!data.latitude || !data.longitude) {
        console.error("No latitude/longitude found for station.");
        return;
      }

      // Smooth zoom to selected station
      map.flyTo([data.latitude, data.longitude], 12, {
        animate: true,
        duration: 1.5,
      });

      // Show popup with animation
      L.popup({
        className: "custom-popup",
        offset: [0, -10],
      })
        .setLatLng([data.latitude, data.longitude])
        .setContent(createPopupContent(data))
        .openOn(map);
    } catch (error) {
      console.error("Error fetching station details:", error);
    }
  };

  return (
    <div className="map-page">
      <SearchComponent onSearch={handleSearch} />
      <div className="map-container">
        {isLoading && (
          <div className="loading-screen">
            <div className="loading-content">
              <div className="dot-loader">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
              <div className="random-fact">
                <p>Did you know?</p>
                <p>{randomFact || "Fetching a fun fact..."}</p>
              </div>
            </div>
          </div>
        )}
        <div id="map"></div>
      </div>
    </div>
  );
};

export default Map;