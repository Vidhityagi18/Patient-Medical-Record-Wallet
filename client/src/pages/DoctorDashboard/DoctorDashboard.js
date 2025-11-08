// src/components/DoctorDashboard/DoctorDashboard.js
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Profile from "./Profile";
import Appointments from "./Appointments";
import MyPatients from "./MyPatients";

import logo from "../../images/img2.jpg";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { ethers } from "ethers";
import MedicalWallet from "../../artifacts/MedicalWallet.json";

const CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [doctorData, setDoctorData] = useState(null);
  const [ipfsMeta, setIpfsMeta] = useState(null);

  const [newAppointments, setNewAppointments] = useState(0);
  const [patientCount, setPatientCount] = useState(0);

  const navigate = useNavigate();

  // ✅ Load counts from smart contract
  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const doctor = await signer.getAddress();
      const contract = new ethers.Contract(CONTRACT, MedicalWallet.abi, signer);

      const appts = await contract.getMyAppointments();

      // ✅ Count pending appointments
      const pending = appts.filter(a => Number(a.status) === 0).length;
      setNewAppointments(pending);

      // ✅ Count approved patients
      const approved = appts.filter(a => Number(a.status) === 1).map(a => a.patient);
      const uniquePatients = [...new Set(approved)].length;
      setPatientCount(uniquePatients);

    } catch (err) {
      console.error("Failed stats load:", err);
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <Profile
            onDataLoad={(data, meta) => {
              setDoctorData(data);
              setIpfsMeta(meta);
            }}
          />
        );
      case "appointments":
        return <Appointments />;
      case "patients":
        return <MyPatients />;
      default:
        return <Profile />;
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* HEADER */}
      <nav
  className="navbar navbar-light bg-white shadow-sm position-fixed top-0 w-100"
  style={{ zIndex: 1000 }}
>
  <div className="container-fluid" >
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

    <button className="btn btn-outline-secondary" onClick={() => navigate("/")}>
      ← Back to Home
    </button>
  </div>
</nav>

      

      {/* FIXED SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        doctorData={doctorData}
        ipfsMeta={ipfsMeta}
        newAppointments={newAppointments}
        patientCount={patientCount}
      />

      {/* SCROLLABLE RIGHT CONTENT */}
     <div
  className="flex-grow-1 p-4 bg-light"
  style={{
    marginLeft: "260px",
    marginTop: "70px",
    minHeight: "calc(100vh - 70px)",
    overflowY: "auto",
  }}
>

        {renderContent()}
      </div>
    </div>
  );
};

export default DoctorDashboard;
