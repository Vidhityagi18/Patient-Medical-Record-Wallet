import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/home";

import RegisterPatient from "./pages/RegisterPatient";
import RegisterDoctor from "./pages/DoctorRegistration";

import PatientDashboard from "./pages/PatientDashboard/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard/DoctorDashboard";
import DoctorViewProfile from "./pages/DoctorDashboard/DoctorViewProfile";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register-patient" element={<RegisterPatient />} />
        <Route path="/register-doctor" element={<RegisterDoctor />} />
        <Route path="/patient" element={<PatientDashboard />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
        <Route path="/doctor/:wallet" element={<DoctorViewProfile />} />
        
      </Routes>
    </Router>
  );
}

export default App;
