import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const EQUIPMENTS = [
  "R-S1",
  "R-S3",
  "RH04",
  "RH05",
  "RH06",
  "RH07",
  "RH08",
  "RH10",
  "RH12",
  "RH13",
  "RTG9",
  "RTG5",
  "RTG6",
  "RTG8",
  "R-S2"
];

export default function Login() {
  const [equipmentId, setEquipmentId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!equipmentId) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `https://ctas.live/backend/api/get/rst/application/jobs/v2?equipment_id=${equipmentId}`
      );
      const json = await res.json();

      if (json?.equipment_location) {
        navigate(`/map/${equipmentId}`);
      } else {
        setError("Invalid equipment selected");
      }
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#0f172a"
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 30,
          borderRadius: 10,
          width: 360
        }}
      >
        <h2 style={{ marginBottom: 20 }}>Select Equipment</h2>

        <label style={{ fontSize: 14, marginBottom: 6, display: "block" }}>
          Equipment Name
        </label>

        <select
          value={equipmentId}
          onChange={e => setEquipmentId(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: "1px solid #7c3aed",
            marginBottom: 16
          }}
        >
          <option value="">Select Equipment</option>
          {EQUIPMENTS.map(eq => (
            <option key={eq} value={eq}>
              {eq}
            </option>
          ))}
        </select>

        <button
          onClick={handleLogin}
          disabled={loading || !equipmentId}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          {loading ? "Checking..." : "Login"}
        </button>

        {error && (
          <div style={{ color: "red", marginTop: 12 }}>{error}</div>
        )}
      </div>
    </div>
  );
}
