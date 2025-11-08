// src/components/DoctorDashboard/Sidebar.js
import React from "react";
import { FaUserMd, FaCalendarCheck, FaUsers } from "react-icons/fa";

const Sidebar = ({ activeTab, setActiveTab, doctorData, ipfsMeta, newAppointments, patientCount }) => {

  const menuItems = [
    { id: "profile", icon: FaUserMd, label: "My Profile" },
    { id: "appointments", icon: FaCalendarCheck, label: "Appointments", badge: newAppointments },
    { id: "patients", icon: FaUsers, label: "My Patients", badge: patientCount },
  ];

  const doctorName = doctorData?.name || "Doctor";

  return (
    <div
      className="text-white p-3 position-fixed"
      style={{
        width: "260px",
        height: "100vh",
        background: "linear-gradient(135deg,#198754 0%, #0d6efd 100%)",
        overflowY: "hidden",
      }}
    >
      {/* Doctor summary */}
      <div className="text-center mb-4 p-3 rounded" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="rounded-circle mb-2"
          style={{
            width: "70px",
            height: "70px",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            border: "3px solid rgba(255,255,255,0.25)",
          }}
        >
          <FaUserMd className="fs-3" style={{ color: "#198754" }} />
        </div>

        <h6 className="mb-1 text-white">Dr. {doctorName}</h6>
        <small className="text-white opacity-75">
          {doctorData?.specialization || "Medical Expert"}
        </small>
      </div>

      {/* Menu */}
      <h6 className="text-uppercase opacity-75 mb-3 small">Menu</h6>
      {menuItems.map((item) => (
        <div
          key={item.id}
          className={`p-3 mb-2 rounded-3 ${activeTab === item.id ? "bg-white text-dark shadow-sm" : "text-white"}`}
          style={{ cursor: "pointer" }}
          onClick={() => setActiveTab(item.id)}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <item.icon className={`me-2 ${activeTab === item.id ? "text-success" : "text-white"}`} />
              <span>{item.label}</span>
            </div>

            {item.badge > 0 && (
              <span className="badge bg-danger">{item.badge}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Sidebar;

