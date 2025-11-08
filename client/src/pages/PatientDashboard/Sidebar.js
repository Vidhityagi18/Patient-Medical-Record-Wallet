// src/components/PatientDashboard/Sidebar.js
import React from "react";
import { FaUser, FaCalendarAlt, FaStethoscope, FaClinicMedical, FaHeartbeat, FaPills, FaFileMedical, FaUserMd, FaCalendarCheck, FaNotesMedical } from "react-icons/fa";

const Sidebar = ({ activeTab, setActiveTab, patientData, ipfsMeta }) => {
  // Calculate real stats from patient data
  const calculateStats = () => {
    if (!ipfsMeta) return null;

    const medicalFilesCount = ipfsMeta.documents?.length || 0;
    const prescriptionsCount = ipfsMeta.prescriptions?.length || 0;
    const appointmentsCount = 3; // This would come from appointments data
    const conditionsCount = ipfsMeta.condition?.length || 0;

    return {
      medicalFilesCount,
      prescriptionsCount,
      appointmentsCount,
      conditionsCount
    };
  };

  const stats = calculateStats();

  const menuItems = [
    { 
      id: "profile", 
      icon: FaUser, 
      label: "My Profile", 
      badge: null 
    },
    { 
      id: "appointments", 
      
      icon: FaStethoscope, 
      label: "Consult Doctor", 
      badge: stats ? stats.appointmentsCount.toString() : "0"
    },
    { 
      id: "consult", 
     icon: FaCalendarAlt, 
      label: "Appointments", 
      badge: stats ? stats.appointmentsCount.toString() : "0"
     
    },
  ];

  const quickStats = [
    { 
      icon: FaFileMedical, 
      value: stats ? stats.medicalFilesCount.toString() : "0", 
      label: "Medical Files", 
      color: "text-primary" 
    },
    { 
      icon: FaPills, 
      value: stats ? stats.prescriptionsCount.toString() : "0", 
      label: "Prescriptions", 
      color: "text-success" 
    },
    { 
      icon: FaNotesMedical, 
      value: stats ? stats.conditionsCount.toString() : "0", 
      label: "Conditions", 
      color: "text-warning" 
    },
    { 
      icon: FaCalendarCheck, 
      value: stats ? stats.appointmentsCount.toString() : "0", 
      label: "Appointments", 
      color: "text-info" 
    },
  ];

  // Get patient name for welcome message
  const patientName = patientData?.name || "Patient";

  return (
    <div 
      className="text-white p-3" 
      style={{ 
        width: "280px", 
        minHeight: "100vh",
        position: "sticky",
        top: 0,
        background: "linear-gradient(135deg, #198754 0%, #0d6efd 100%)",
        boxShadow: "2px 0 10px rgba(0,0,0,0.1)"
      }}
    >
      {/* User Profile Summary with Real Data */}
      <div className="text-center mb-4 p-3 rounded" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2" 
             style={{width: "60px", height: "60px"}}>
          <FaUser className="text-success fs-4" />
        </div>
        <h6 className="mb-1 text-white">Welcome, {patientName}!</h6>
        <small className="text-white opacity-75">
          {patientData?.age ? `${patientData.age} years` : "Patient Dashboard"}
        </small>
      </div>

      {/* Main Menu */}
      <h6 className="text-uppercase text-white opacity-75 mb-3 small fw-bold">Main Menu</h6>
      <div className="mb-4">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`p-3 mb-2 rounded-3 ${
              activeTab === item.id 
                ? "bg-white text-dark shadow-sm" 
                : "text-white"
            }`}
            style={{ 
              cursor: "pointer",
              transition: "all 0.3s ease",
              border: activeTab === item.id ? "2px solid #198754" : "2px solid transparent",
              background: activeTab === item.id ? "white" : "rgba(255,255,255,0.05)"
            }}
            onClick={() => setActiveTab(item.id)}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <item.icon className={`me-3 ${activeTab === item.id ? 'text-success' : 'text-white'}`} />
                <span className={`fw-medium ${activeTab === item.id ? 'text-dark' : 'text-white'}`}>
                  {item.label}
                </span>
              </div>
              {item.badge && (
                <span className={`badge ${
                  item.id === "consult" ? "bg-danger" : "bg-primary"
                } rounded-pill`}>
                  {item.badge}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats - Real Data */}
      <div className="mt-4 pt-4 border-top border-white border-opacity-25">
        <h6 className="text-uppercase text-white opacity-75 mb-3 small fw-bold">Health Summary</h6>
        <div className="row g-2 text-center">
          {quickStats.map((stat, index) => (
            <div key={index} className="col-6">
              <div className="rounded p-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                <stat.icon className={`${stat.color} mb-1`} />
                <div className="fw-bold text-white">{stat.value}</div>
                <small className="text-white opacity-75">{stat.label}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medical Status */}
      {ipfsMeta?.condition && ipfsMeta.condition.length > 0 && (
        <div className="mt-4 pt-4 border-top border-white border-opacity-25">
          <h6 className="text-uppercase text-white opacity-75 mb-3 small fw-bold">Active Conditions</h6>
          <div className="text-center">
            <span className="badge bg-warning text-dark me-1 mb-1">
              {ipfsMeta.condition[0]}
            </span>
            {ipfsMeta.condition.length > 1 && (
              <span className="badge bg-light text-dark">
                +{ipfsMeta.condition.length - 1} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      <div className="mt-4 pt-4 border-top border-white border-opacity-25">
        <h6 className="text-uppercase text-white opacity-75 mb-3 small fw-bold">Emergency</h6>
        <div className="text-center">
          <button className="btn btn-danger btn-sm w-100">
            <FaClinicMedical className="me-2" />
            Emergency Help
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;