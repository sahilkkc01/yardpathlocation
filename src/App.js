import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import RstJobsMap from "./RstJobsMap";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/map/:equipmentId" element={<RstJobsMap />} />
      </Routes>
    </BrowserRouter>
  );
}
