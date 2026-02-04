import React, { useEffect, useState, useMemo } from "react";
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
const fallbackCenter = { lat: 28.512, lng: 77.2878 };

const dropIcon = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
const otherJobIcon = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";

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
      if (g[n] && !g[n].neighbors.includes(k)) g[n].neighbors.push(k);
    });
  });

  return g;
}

function extractDropLatLng(str) {
  if (!str) return null;
  const firstPair = str.split(",")[0];
  const [lat, lng] = firstPair.split(" ").map(Number);
  if (!lat || !lng) return null;
  return { lat, lng };
}

export default function RstJobsMap() {
  const { equipmentId } = useParams();
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_API_KEY
  });

  const [warehouseJobs, setWarehouseJobs] = useState([]);
  const [otherJobs, setOtherJobs] = useState([]);

  const [rst, setRst] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);

  const [pathCoords, setPathCoords] = useState([]);
  const [distance, setDistance] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("warehouse");

  const yardGraph = useMemo(() => makeSymmetricGraph(rawYardGraph), []);

  // ✅ Fetch Jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch(
          `https://ctas.live/backend/api/get/rst/application/jobs/v2?equipment_id=${equipmentId}`
        );

        const json = await res.json();

        setWarehouseJobs(json.warehouse_jobs || []);
        setOtherJobs(json.data || []);

        if (json.equipment_location) {
          setRst(json.equipment_location);

          setMapCenter({
            lat: json.equipment_location.lat,
            lng: json.equipment_location.lng
          });
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);

    return () => clearInterval(interval);
  }, [equipmentId]);

  // ✅ Auto Sort Warehouse Jobs Distance Wise
  const filteredWarehouse = useMemo(() => {
    if (!rst) return [];

    return warehouseJobs
      .map(job => {
        let stk = job.container_master?.last_stk_loc;
        if (!stk) return null;

        stk = stk.replace(/[A-Z]$/, "");

        const matchedBox = yardLocations.find(loc => loc.name === stk);
        if (!matchedBox) return null;

        const boxCenter = getCenter([
          matchedBox.latlng1,
          matchedBox.latlng2,
          matchedBox.latlng3,
          matchedBox.latlng4
        ]);

        // ✅ Find shortest path
        const coords = findPathBetweenPositions(
          yardGraph,
          { lat: rst.lat, lng: rst.lng },
          boxCenter
        );

        let totalDist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
          totalDist += haversineMeters(coords[i], coords[i + 1]);
        }

        return {
          ...job,
          distance: totalDist,
          boxCenter
        };
      })
      .filter(Boolean)
      .filter(job =>
        job.container_no?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.distance - b.distance); // ✅ Nearest first
  }, [warehouseJobs, searchTerm, rst, yardGraph]);

  // ✅ Other Jobs Filter
  const filteredOther = otherJobs.filter(job =>
    job.container_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Warehouse Click
  const handleWarehouseClick = job => {
    setActiveTab("warehouse");
    setSelectedJob(job);

    if (!rst) return;

    let stk = job.container_master?.last_stk_loc;
    if (!stk) return alert("No last_stk_loc found!");

    stk = stk.replace(/[A-Z]$/, "");

    const matchedBox = yardLocations.find(loc => loc.name === stk);
    if (!matchedBox) return alert("Box not found: " + stk);

    setSelectedBox(matchedBox);

    const boxCenter = getCenter([
      matchedBox.latlng1,
      matchedBox.latlng2,
      matchedBox.latlng3,
      matchedBox.latlng4
    ]);

    setMapCenter(boxCenter);

    const coords = findPathBetweenPositions(
      yardGraph,
      { lat: rst.lat, lng: rst.lng },
      boxCenter
    );

    setPathCoords(coords);

    let totalDist = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      totalDist += haversineMeters(coords[i], coords[i + 1]);
    }

    setDistance(totalDist);
  };

  // ✅ Other Job Click
  const handleOtherJobClick = job => {
    setActiveTab("other");
    setSelectedJob(job);

    setSelectedBox(null);
    setPathCoords([]);
    setDistance(null);

    if (!rst) return;

    if (job.job_type === "rake_out") {
      let pickup = job.pickup_from;
      if (!pickup) return alert("Pickup missing!");

      pickup = pickup.replace(/[A-Z]$/, "");

      const pickupBox = yardLocations.find(loc => loc.name === pickup);
      if (!pickupBox) return alert("Pickup box not found: " + pickup);

      const pickupCenter = getCenter([
        pickupBox.latlng1,
        pickupBox.latlng2,
        pickupBox.latlng3,
        pickupBox.latlng4
      ]);

      setMapCenter(pickupCenter);

      setSelectedJob({
        ...job,
        drop_lat_long: `${pickupCenter.lat} ${pickupCenter.lng}`
      });

      const coords = findPathBetweenPositions(
        yardGraph,
        { lat: rst.lat, lng: rst.lng },
        pickupCenter
      );

      setPathCoords(coords);
      return;
    }

    const dropPoint = extractDropLatLng(job.drop_lat_long);
    if (!dropPoint) return alert("Drop LatLong missing!");

    setMapCenter(dropPoint);
  };

  if (!isLoaded) return <div>Loading Map...</div>;

  const rstIcon = {
    url: "/logo.png",
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 }
  };

  const boxPoints = selectedBox
    ? [
        selectedBox.latlng1,
        selectedBox.latlng2,
        selectedBox.latlng3,
        selectedBox.latlng4
      ]
    : [];

  const boxCenter = boxPoints.length > 0 ? getCenter(boxPoints) : null;

  const otherDropPoint =
    activeTab === "other"
      ? extractDropLatLng(selectedJob?.drop_lat_long)
      : null;

  return (
    <div style={{ display: "flex" }}>
      {/* ✅ Sidebar */}
      <div
        style={{
          width: 350,
          height: "100vh",
          background: "#111",
          color: "#fff",
          padding: 12,
          overflowY: "auto"
        }}
      >
        <h3>{equipmentId} Jobs</h3>

        {/* ✅ Tabs */}
        <div style={{ display: "flex", marginBottom: 15 }}>
          <button
            onClick={() => setActiveTab("warehouse")}
            style={{
              flex: 1,
              padding: 10,
              background: activeTab === "warehouse" ? "#22c55e" : "#222",
              border: "none",
              color: "white"
            }}
          >
            Warehouse
          </button>

          <button
            onClick={() => setActiveTab("other")}
            style={{
              flex: 1,
              padding: 10,
              background: activeTab === "other" ? "#3b82f6" : "#222",
              border: "none",
              color: "white"
            }}
          >
            Other
          </button>
        </div>

        {/* ✅ Search */}
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

        {/* ✅ Warehouse Sorted List */}
        {activeTab === "warehouse" &&
          filteredWarehouse.map(job => (
            <div
              key={job.id}
              onClick={() => handleWarehouseClick(job)}
              style={{
                padding: 10,
                marginBottom: 8,
                borderRadius: 6,
                cursor: "pointer",
                background: selectedJob?.id === job.id ? "#22c55e" : "#222"
              }}
            >
              <b>{job.container_no}</b>
              <div>Type: {job.job_type}</div>
              <div>Loc: {job.container_master?.last_stk_loc}</div>

              {/* ✅ Distance Display */}
              <div style={{ color: "#00ff00", marginTop: 4 }}>
                Distance: {job.distance.toFixed(1)} m
              </div>
            </div>
          ))}

        {/* ✅ Other Jobs List */}
        {activeTab === "other" &&
          filteredOther.map(job => (
            <div
              key={job.id}
              onClick={() => handleOtherJobClick(job)}
              style={{
                padding: 10,
                marginBottom: 8,
                borderRadius: 6,
                cursor: "pointer",
                background: selectedJob?.id === job.id ? "#3b82f6" : "#222"
              }}
            >
              <b>{job.container_no}</b>
              <div>Type: {job.job_type}</div>

              {job.job_type === "rake_out" ? (
                <div>Pickup: {job.pickup_from}</div>
              ) : (
                <div>Drop: {job.drop_to}</div>
              )}
            </div>
          ))}

        {/* ✅ Logout */}
        <button
          onClick={() => navigate("/")}
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

      {/* ✅ Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter || fallbackCenter}
        zoom={19}
        mapTypeId="satellite"
      >
        {/* ✅ RST Marker */}
        {rst && <Marker position={rst} icon={rstIcon} />}

        {/* ✅ Warehouse Box Polygon */}
        {activeTab === "warehouse" && boxPoints.length > 0 && (
          <Polygon paths={boxPoints} />
        )}

        {/* ✅ Box Center Marker */}
        {activeTab === "warehouse" && boxCenter && (
          <Marker position={boxCenter} icon={dropIcon} />
        )}

        {/* ✅ Path Line */}
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

        {/* ✅ Other Drop Marker */}
        {otherDropPoint && (
          <Marker position={otherDropPoint} icon={otherJobIcon} />
        )}
      </GoogleMap>
    </div>
  );
}
