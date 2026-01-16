import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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
        setError("Invalid machine ID");
      }
    } catch {
      setError("Unable to connect");
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
          width: 320,
          textAlign: "center"
        }}
      >
        <h2>RST Login</h2>

        <input
          placeholder="Enter Machine ID (R-S1)"
          value={equipmentId}
          onChange={e => setEquipmentId(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 12,
            borderRadius: 6,
            border: "1px solid #ccc"
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
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
          <div style={{ color: "red", marginTop: 10 }}>{error}</div>
        )}
      </div>
    </div>
  );
}
