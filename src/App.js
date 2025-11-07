import React, { useEffect, useState, useCallback } from "react";
import { GoogleMap, Polygon, useJsApiLoader } from "@react-google-maps/api";
import boxesData from "./yardBoxes.json";

const containerStyle = { width: "100%", height: "100vh" };
const center = { lat: 28.5120, lng: 77.2878 };
const GOOGLE_API_KEY = "AIzaSyDPMF7fzNp0C0PJbwtSFQNf1icTv2ceO4c";

export default function GoogleYardBoxes() {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_API_KEY });
  const [boxes, setBoxes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBox, setSelectedBox] = useState(null);

  const loadBoxes = useCallback(() => {
    setBoxes(boxesData);
  }, []);

  useEffect(() => {
    loadBoxes();
  }, [loadBoxes]);

  if (!isLoaded) return <div>Loading map...</div>;

  // Filter boxes by search term (case-insensitive)
  const filteredBoxes = boxes.filter(box =>
    box.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Search Bar */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.9)",
          padding: "8px 12px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          zIndex: 10,
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search box name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            outline: "none",
            width: "220px",
          }}
        />
        <button
          onClick={() => setSearchTerm("")}
          style={{
            background: "#007bff",
            color: "white",
            border: "none",
            padding: "6px 10px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      {/* Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={19}
        mapTypeId="satellite"
      >
        {filteredBoxes.map((box, index) => {
          const path = [
            box.latlng1,
            box.latlng2,
            box.latlng3,
            box.latlng4,
          ];

          return (
            <Polygon
              key={index}
              paths={path}
              options={{
                fillColor: selectedBox?.name === box.name ? "rgba(255, 0, 0, 0.5)" : "rgba(0, 150, 255, 0.4)",
                strokeColor: selectedBox?.name === box.name ? "#ff0000" : "#0044ff",
                strokeWeight: 2,
                clickable: true,
              }}
              onClick={() => setSelectedBox(box)}
            />
          );
        })}
      </GoogleMap>

      {/* Selected Box Info */}
      {selectedBox && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.95)",
            padding: "10px 16px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            fontWeight: "bold",
            zIndex: 10,
          }}
        >
          🟦 Selected Box: {selectedBox.name}
        </div>
      )}
    </div>
  );
}
