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
const otherJobIcon = "hhttp://maps.google.com/mapfiles/ms/icons/red-dot.png";

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
  const [otherPoint, setOtherPoint] = useState(null);


  const [rst, setRst] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);

  const [pathCoords, setPathCoords] = useState([]);
  const [distance, setDistance] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("warehouse");

  const yardGraph = useMemo(() => makeSymmetricGraph(rawYardGraph), []);

  useEffect(() => {
    const fetchJobs = async () => {
      const res = await fetch(
        `https://ctas.live/backend/api/get/rst/application/jobs/v2?equipment_id=${equipmentId}`
      );
      const json = await res.json();

      setWarehouseJobs(json.warehouse_jobs || []);
      setOtherJobs(json.data || []);

      if (json.equipment_location) {
        setRst(json.equipment_location);
        setMapCenter(json.equipment_location);
      }
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [equipmentId]);

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

        const coords = findPathBetweenPositions(
          yardGraph,
          { lat: rst.lat, lng: rst.lng },
          boxCenter
        );

        let totalDist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
          totalDist += haversineMeters(coords[i], coords[i + 1]);
        }

        return { ...job, distance: totalDist };
      })
      .filter(Boolean)
      .filter(job =>
        job.container_no?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.distance - b.distance);
  }, [warehouseJobs, searchTerm, rst, yardGraph]);

  const filteredOther = useMemo(() => {
    if (!rst) return [];

    return otherJobs
      .map(job => {
        let point = null;

        if (job.job_type === "rake_out") {
          let pickup = job.pickup_from;
          if (!pickup) return null;

          pickup = pickup.replace(/[A-Z]$/, "");
          const pickupBox = yardLocations.find(loc => loc.name === pickup);
          if (!pickupBox) return null;

          point = getCenter([
            pickupBox.latlng1,
            pickupBox.latlng2,
            pickupBox.latlng3,
            pickupBox.latlng4
          ]);
        } else {
          point = extractDropLatLng(job.drop_lat_long);
          if (!point) return null;
        }

        const coords = findPathBetweenPositions(
          yardGraph,
          { lat: rst.lat, lng: rst.lng },
          point
        );

        let totalDist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
          totalDist += haversineMeters(coords[i], coords[i + 1]);
        }

        return { ...job, distance: totalDist };
      })
      .filter(Boolean)
      .filter(job =>
        job.container_no?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.distance - b.distance);
  }, [otherJobs, searchTerm, rst, yardGraph]);

  const handleWarehouseClick = job => {
    setActiveTab("warehouse");
    setSelectedJob(job);

    let stk = job.container_master?.last_stk_loc;
    if (!stk) return;

    stk = stk.replace(/[A-Z]$/, "");
    const matchedBox = yardLocations.find(loc => loc.name === stk);
    if (!matchedBox) return;

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

  // 🔴 ONLY CHANGE IS HERE
  const handleOtherJobClick = job => {
    setActiveTab("other");
    setSelectedJob(job);

    setSelectedBox(null);
    setDistance(job.distance);

    if (job.job_type === "rake_out") {
      let pickup = job.pickup_from;
      if (!pickup) return;

      pickup = pickup.replace(/[A-Z]$/, "");
      const pickupBox = yardLocations.find(loc => loc.name === pickup);
      if (!pickupBox) return;

      const pickupCenter = getCenter([
        pickupBox.latlng1,
        pickupBox.latlng2,
        pickupBox.latlng3,
        pickupBox.latlng4
      ]);

      setMapCenter(pickupCenter);
setOtherPoint(pickupCenter);

const coords = findPathBetweenPositions(
  yardGraph,
  { lat: rst.lat, lng: rst.lng },
  pickupCenter
);

setPathCoords(coords);
return;

    }

    // ❌ no path for non-rake_out
    setPathCoords([]);

    const dropPoint = extractDropLatLng(job.drop_lat_long);
    if (!dropPoint) return;

   setMapCenter(dropPoint);
setOtherPoint(dropPoint);

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

const otherDropPoint = activeTab === "other" ? otherPoint : null;


  return (
    <div style={{ display: "flex" }}>
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

        {distance && (
          <div style={{ marginBottom: 12, color: "#00ff00" }}>
            Selected Distance: {distance.toFixed(1)} m
          </div>
        )}

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
              <div>{job.container_master?.last_stk_loc}</div>
              <div style={{ color: "#00ff00" }}>
                Distance: {job.distance.toFixed(1)} m
              </div>
            </div>
          ))}

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

              <div style={{ color: "#00ff00" }}>
                Distance: {job.distance.toFixed(1)} m
              </div>
            </div>
          ))}

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

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter || fallbackCenter}
        zoom={19}
        mapTypeId="satellite"
      >
        {rst && <Marker position={rst} icon={rstIcon} />}

        {activeTab === "warehouse" && boxPoints.length > 0 && (
          <Polygon paths={boxPoints} />
        )}

        {activeTab === "warehouse" && boxCenter && (
          <Marker position={boxCenter} icon={dropIcon} />
        )}

        {activeTab === "warehouse" && pathCoords.length > 0 && (
          <Polyline path={pathCoords} 
           options={{
              strokeColor: "#00FF00",
              strokeWeight: 5,
              strokeOpacity: 0.9
            }}/>
        )}

        {activeTab === "other" &&
          selectedJob?.job_type === "rake_out" &&
          pathCoords.length > 0 && <Polyline path={pathCoords} 
           options={{
              strokeColor: "#00FF00",
              strokeWeight: 5,
              strokeOpacity: 0.9
            }} />}

        {otherDropPoint && (
          <Marker position={otherDropPoint} icon={otherJobIcon} />
        )}
      </GoogleMap>
    </div>
  );
}
