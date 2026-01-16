import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { GoogleMap, Marker, Polygon, useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_API_KEY = "AIzaSyDPMF7fzNp0C0PJbwtSFQNf1icTv2ceO4c";
const containerStyle = { width: "100%", height: "100vh" };
const fallbackCenter = { lat: 28.5120, lng: 77.2878 };

const dropIcon = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";

function parseLatLngString(value) {
  if (!value) return [];
  return value
    .split(",")
    .map(p => {
      const [lat, lng] = p.trim().split(/\s+/);
      return { lat: parseFloat(lat), lng: parseFloat(lng) };
    })
    .filter(p => !isNaN(p.lat) && !isNaN(p.lng));
}

function getCenter(points) {
  let lat = 0;
  let lng = 0;
  points.forEach(p => {
    lat += p.lat;
    lng += p.lng;
  });
  return {
    lat: lat / points.length,
    lng: lng / points.length
  };
}

export default function RstJobsMap() {
  const { equipmentId } = useParams();
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_API_KEY });

  const mapRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [rst, setRst] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(
        `https://ctas.live/backend/api/get/rst/application/jobs/v2?equipment_id=${equipmentId}`
      );
      const json = await res.json();

      setJobs(json.data || []);
      setRst(json.equipment_location || null);

      if (json.equipment_location) {
        setMapCenter({
          lat: json.equipment_location.lat,
          lng: json.equipment_location.lng
        });
      }
    };
    load();
  }, [equipmentId]);

  const handleJobClick = job => {
    setSelectedJob(job);
    if (!mapRef.current || !rst) return;

    const points = parseLatLngString(job.drop_lat_long);
    if (!points.length) return;

    const center = getCenter(points);

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: rst.lat, lng: rst.lng });
    bounds.extend(center);
    mapRef.current.fitBounds(bounds);
  };

  if (!isLoaded) return <div>Loading…</div>;

  const dropPoints = selectedJob
    ? parseLatLngString(selectedJob.drop_lat_long)
    : [];

  const dropCenter =
    dropPoints.length > 0 ? getCenter(dropPoints) : null;

  const rstIcon = {
    url: "/rst1.jpg",
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 }
  };

  return (
    <div style={{ display: "flex" }}>
      {/* LEFT JOB LIST */}
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
        <h3 style={{ position: "sticky", top: 0, background: "#111", paddingBottom: 8 }}>
          {equipmentId} Jobs
        </h3>

        {jobs.map(job => (
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
            <div><b>Job #{job.id}</b></div>
            <div>Type: {job.job_type}</div>
            <div>Container: {job.container_no}</div>
            <div>Drop: {job.drop_to}</div>
          </div>
        ))}
      </div>

      {/* MAP */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter || fallbackCenter}
        zoom={19}
        mapTypeId="satellite"
        onLoad={map => (mapRef.current = map)}
      >
        {rst && (
          <Marker
            position={{ lat: rst.lat, lng: rst.lng }}
            icon={rstIcon}
          />
        )}

        {dropPoints.length > 0 && (
          <Polygon
            paths={dropPoints}
            options={{
              fillColor: "rgba(255,0,0,0.35)",
              strokeColor: "#ff0000",
              strokeWeight: 2
            }}
          />
        )}

        {dropCenter && (
          <Marker
            position={dropCenter}
            icon={dropIcon}
          />
        )}
      </GoogleMap>
    </div>
  );
}
