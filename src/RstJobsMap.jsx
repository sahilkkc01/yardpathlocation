import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  GoogleMap,
  Marker,
  Polygon,
  Polyline,
  useJsApiLoader
} from "@react-google-maps/api";

import yardLocations from "./data/yard_locations.json";
import { yardGraph as rawYardGraph } from "./data/yardGraph";

import {
  findPathBetweenPositions,
  haversineMeters
} from "./utils/shortestPath";

const GOOGLE_API_KEY = "AIzaSyDPMF7fzNp0C0PJbwtSFQNf1icTv2ceO4c";

const containerStyle = { width: "100%", height: "100vh" };
const fallbackCenter = { lat: 28.5120, lng: 77.2878 };

const dropIcon = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";

/* ============================
    Helpers
============================ */
function getCenter(points) {
  let lat = 0,
    lng = 0;
  points.forEach(p => {
    lat += p.lat;
    lng += p.lng;
  });
  return { lat: lat / points.length, lng: lng / points.length };
}

function makeSymmetricGraph(input) {
  const g = {};
  Object.keys(input).forEach(k => {
    g[k] = {
      lat: input[k].lat,
      lng: input[k].lng,
      neighbors: [...(input[k].neighbors || [])]
    };
  });

  Object.keys(g).forEach(k => {
    g[k].neighbors.forEach(n => {
      if (g[n] && !g[n].neighbors.includes(k)) {
        g[n].neighbors.push(k);
      }
    });
  });

  return g;
}

/* ============================
    MAIN COMPONENT
============================ */
export default function RstJobsMap() {
  const { equipmentId } = useParams();
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_API_KEY
  });

  const mapRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [rst, setRst] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);

  const [pathCoords, setPathCoords] = useState([]);
  const [distance, setDistance] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  // ✅ Fix 1: Force map refresh
  const [mapKey, setMapKey] = useState(0);

  // ✅ Fix 2: Save box center for fitBounds after refresh
  const [targetBoxCenter, setTargetBoxCenter] = useState(null);

  /* ✅ Graph */
  const yardGraph = useMemo(
    () => makeSymmetricGraph(rawYardGraph),
    []
  );

  /* ============================
      FETCH JOBS (warehouse_jobs)
  ============================ */
  useEffect(() => {
    const load = async () => {
      const res = await fetch(
        `https://ctas.live/backend/api/get/rst/application/jobs/v2?equipment_id=${equipmentId}`
      );

      const json = await res.json();

      // ✅ Only warehouse_jobs
      setJobs(json.warehouse_jobs || []);

      // ✅ Equipment location
      setRst(json.equipment_location || null);

      // ✅ Center map initially on equipment
      if (json.equipment_location) {
        setMapCenter({
          lat: json.equipment_location.lat,
          lng: json.equipment_location.lng
        });
      }
    };

    load();
  }, [equipmentId]);

  /* ============================
      CLICK JOB
  ============================ */
  const handleJobClick = job => {
    // ✅ Refresh map each click (removes stuck first path)
    setMapKey(prev => prev + 1);

    setSelectedJob(job);

    if (!rst) return;

    // ✅ last_stk_loc
    let stk = job.container_master?.last_stk_loc;

    if (!stk) {
      alert("No last_stk_loc found!");
      return;
    }

    // ✅ Remove last A/B/C
    stk = stk.replace(/[A-Z]$/, "");

    // ✅ Find box in yard_locations.json
    const matchedBox = yardLocations.find(loc => loc.name === stk);

    if (!matchedBox) {
      alert("Box not found in yard_locations.json: " + stk);
      return;
    }

    setSelectedBox(matchedBox);

    // ✅ Box polygon points
    const boxPoints = [
      matchedBox.latlng1,
      matchedBox.latlng2,
      matchedBox.latlng3,
      matchedBox.latlng4
    ];

    const boxCenter = getCenter(boxPoints);

    // ✅ Save center for AFTER refresh zoom
    setTargetBoxCenter(boxCenter);

    // ✅ Shortest Path Equipment → Box Center
    const coords = findPathBetweenPositions(
      yardGraph,
      { lat: rst.lat, lng: rst.lng },
      boxCenter
    );

    setPathCoords(coords);

    // ✅ Distance
    let totalDist = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      totalDist += haversineMeters(coords[i], coords[i + 1]);
    }

    setDistance(totalDist);
  };

  /* ============================
      LOGOUT
  ============================ */
  const handleLogout = () => navigate("/");

  if (!isLoaded) return <div>Loading Map...</div>;

  /* ============================
      SEARCH FILTER
  ============================ */
  const filteredJobs = jobs.filter(job =>
    job.container_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ============================
      BOX POINTS
  ============================ */
  const boxPoints = selectedBox
    ? [
        selectedBox.latlng1,
        selectedBox.latlng2,
        selectedBox.latlng3,
        selectedBox.latlng4
      ]
    : [];

  const boxCenter =
    boxPoints.length > 0 ? getCenter(boxPoints) : null;

  /* ✅ Equipment Icon */
  const rstIcon = {
    url: "/logo.png",
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 }
  };

  /* ============================
      UI
  ============================ */
  return (
    <div style={{ display: "flex" }}>
      {/* ================= Sidebar */}
      <div
        style={{
          width: 320,
          height: "100vh",
          background: "#111",
          color: "#fff",
          padding: 12,
          overflowY: "auto"
        }}
      >
        <h3>{equipmentId} Warehouse Jobs</h3>

        {/* Search */}
        <input
          placeholder="Search container..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "none",
            marginBottom: 12
          }}
        />

        {/* Jobs List */}
        {filteredJobs.map(job => (
          <div
            key={job.id}
            onClick={() => handleJobClick(job)}
            style={{
              padding: 10,
              marginBottom: 8,
              borderRadius: 6,
              cursor: "pointer",
              background:
                selectedJob?.id === job.id ? "#22c55e" : "#222"
            }}
          >
            <b>{job.container_no}</b>
            <div>Type: {job.job_type}</div>
            <div>Stock: {job.container_master?.last_stk_loc}</div>
          </div>
        ))}

        {/* Distance */}
        {distance && (
          <div style={{ marginTop: 20, color: "#00ff00" }}>
            ✅ Distance: {distance.toFixed(1)} meters
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: 20,
            width: "100%",
            background: "#dc2626",
            color: "white",
            padding: 10,
            borderRadius: 6,
            border: "none"
          }}
        >
          Logout
        </button>
      </div>

      {/* ================= Map */}
      <GoogleMap
        key={mapKey} // ✅ FULL REFRESH FIX
        mapContainerStyle={containerStyle}
        center={mapCenter || fallbackCenter}
        zoom={19}
        mapTypeId="satellite"
        onLoad={map => {
          mapRef.current = map;

          // ✅ AFTER refresh, show correct path portion
          if (rst && targetBoxCenter) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend({ lat: rst.lat, lng: rst.lng });
            bounds.extend(targetBoxCenter);
            map.fitBounds(bounds);
          }
        }}
      >
        {/* ✅ Equipment Marker */}
        {rst && (
          <Marker
            position={{ lat: rst.lat, lng: rst.lng }}
            icon={rstIcon}
          />
        )}

        {/* ✅ Selected Box Polygon */}
        {boxPoints.length > 0 && (
          <Polygon
            paths={boxPoints}
            options={{
              fillColor: "rgba(255,0,0,0.45)",
              strokeColor: "#ff0000",
              strokeWeight: 2
            }}
          />
        )}

        {/* ✅ Box Marker */}
        {boxCenter && <Marker position={boxCenter} icon={dropIcon} />}

        {/* ✅ Shortest Path */}
        {pathCoords.length > 0 && (
          <Polyline
            path={pathCoords}
            options={{
              strokeColor: "#00FF00",
              strokeWeight: 5,
              strokeOpacity: 0.9
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
