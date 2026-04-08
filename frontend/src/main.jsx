import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "../app/globals.css";
import DemoPage from "./pages/Demo";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/demo" replace />} />
        {/* TODO: replace stubs with real pages as they are implemented */}
        {/* <Route path="/login"                  element={<Login />} /> */}
        {/* <Route path="/register"               element={<Register />} /> */}
        {/* <Route path="/restaurant/dashboard"   element={<RestaurantDashboard />} /> */}
        {/* <Route path="/orders/:id"             element={<OrderTracking />} /> */}
        {/* <Route path="/admin"                  element={<AdminDashboard />} /> */}
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
