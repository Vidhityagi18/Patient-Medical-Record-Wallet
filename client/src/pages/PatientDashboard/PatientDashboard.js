// src/components/PatientDashboard/PatientDashboard.js
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Profile from "./Profile";
import Appointments from "./Appointments";
import ConsultDoctor from "./ConsultDoctor";
import 'bootstrap/dist/css/bootstrap.min.css';
import logo from "../../images/img2.jpg";
import { useNavigate } from "react-router-dom";

// In PatientDashboard.js - update the render function and Sidebar usage
const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [patientData, setPatientData] = useState(null);
  const [ipfsMeta, setIpfsMeta] = useState(null);
  const navigate = useNavigate();

  // You would get this data from your Profile component or context
  // For now, we'll simulate it - in real app, lift state up or use context

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <Profile onDataLoad={(data, meta) => {
          setPatientData(data);
          setIpfsMeta(meta);
        }} />;
      case "appointments":
        return <Appointments />;
      case "consult":
        return <ConsultDoctor />;
      default:
        return <Profile onDataLoad={(data, meta) => {
          setPatientData(data);
          setIpfsMeta(meta);
        }} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
       <nav className="navbar navbar-light bg-white shadow-sm">
        <div className="container-fluid">
          <div className="d-flex align-items-center">
            <img
              src={logo}
              alt="Medical Wallet Logo"
              style={{ width: "40px", height: "40px" }}
              className="me-2 rounded-circle"
            />
            <span className="navbar-brand fw-bold text-success fs-4">
              Patient Medical Record Wallet
            </span>
          </div>

          <button 
            className="btn btn-outline-secondary" 
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="d-flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          patientData={patientData}
          ipfsMeta={ipfsMeta}
        />
        
        <div className="flex-grow-1 p-4 bg-light" style={{ minHeight: "calc(100vh - 76px)" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;