import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import MedicalWallet from "../artifacts/MedicalWallet.json";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import AOS from "aos";
import "aos/dist/aos.css";

import heroImg from "../images/img1.jpg";
import img2 from "../images/img4.jpg";
import img3 from "../images/img5.jpg";
import img4 from "../images/img6.jpg";
import bgImg from "../images/img7.jpg";
import logo from "../images/img2.jpg";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function Home() {
  const [account, setAccount] = useState(null);
  const [role, setRole] = useState(null);
  const [adminAddress, setAdminAddress] = useState(null);
  const [patientCount, setPatientCount] = useState(1024);
  const [doctorCount, setDoctorCount] = useState(256);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask not detected! Please install it from https://metamask.io/");
      return;
    }
    
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const userAddress = accounts[0];
      setAccount(userAddress);
      await checkUserRole(userAddress);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      alert("Failed to connect wallet: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkUserRole(address) {
  if (!window.ethereum) {
    alert("MetaMask not detected!");
    setRole(0);
    return;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

    // Check if contract is deployed
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x") {
      console.error("No contract deployed at address:", CONTRACT_ADDRESS);
      alert("Contract not deployed at the specified address!");
      return;
    }

    // ✅ Fetch admin address
    try {
      const adminAddr = await contract.admin();
      setAdminAddress(adminAddr);
      console.log("Admin address:", adminAddr);
    } catch (err) {
    }

    // ✅ Fetch user role
    try {
      const roleValue = await contract.getUserRole(address);
      const roleNumber = Number(roleValue);
      console.log("User role:", roleNumber);
      setRole(roleNumber);
    } catch (err) {
      console.error("Failed to fetch user role:", err);
      setRole(0);
    }

    // ✅ Fetch both counts at once
    try {
      const [patientCountValue, doctorCountValue] = await contract.getCounts();
      setPatientCount(Number(patientCountValue));
      setDoctorCount(Number(doctorCountValue));
      console.log("Patient count:", Number(patientCountValue));
      console.log("Doctor count:", Number(doctorCountValue));
    } catch (err) {
      console.error("Failed to fetch counts:", err);
    }

  } catch (err) {
    console.error("Error connecting to contract:", err);
    setRole(0);
  }
}


  useEffect(() => {
    if (role !== null && role !== 0) {
      if (role === 1) navigate("/patient");
      else if (role === 2) navigate("/doctor");
      else if (role === 3) navigate("/admin-dashboard");
    }
  }, [role, navigate]);

  useEffect(() => {
    AOS.init({ duration: 1000, once: false });
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85))`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
      }}
      className="d-flex flex-column"
    >
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top w-100 m-0 p-0">
        <div className="container-fluid d-flex align-items-center">
          <img
            src={logo}
            alt="Medical Wallet Logo"
            style={{ width: "40px", height: "40px" }}
            className="me-2 rounded-circle"
          />
          <span className="navbar-brand fw-bold text-success fs-3">
            Patient Medical Record Wallet
          </span>

          <div className="d-flex ms-auto">
            {!account ? (
              <button 
                className="btn btn-success" 
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <span className="badge bg-light text-dark p-2">
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="min-vh-100 d-flex flex-column px-3 px-md-5">
        {/* Hero Section */}
        <section
          className="d-flex align-items-center justify-content-center text-center text-white py-5"
          data-aos="fade-down"
          style={{
            minHeight: "80vh",
            backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${heroImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            borderRadius: "5px",
            marginTop: "5px"
          }}
        >
          <div className="container bg-dark bg-opacity-50 p-4 rounded shadow-lg">
            <h1 className="display-5 fw-bold mb-3">Welcome to Medical Record Wallet</h1>
            <p className="lead">
              Securely store, access, and share your medical records on the blockchain.
            </p>
            {!account && (
              <button 
                className="btn btn-lg mt-3"
                 style={{
                  background: "#182a53ff",
                  color:"white"
                }}

                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? "Connecting..." : "Get Started"}
              </button>
            )}
          </div>
        </section>

        {/* Patient Section */}
        <section
          className="py-5 my-5 text-dark rounded shadow-sm"
          data-aos="fade-up"
          style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
          }}
        >
          <div className="container">
            <div className="row align-items-center">
              <div className="col-md-6 text-center mb-4 mb-md-0">
                <img
                  src={img2}
                  className="img-fluid rounded-4 shadow"
                  alt="Patient Illustration"
                  style={{ maxHeight: "350px", objectFit: "cover" }}
                />
              </div>
              <div className="col-md-6 text-center text-md-start">
                <h2 className="fw-bold mb-3"
                   style={{
                  color: "#182a53ff"
                }}
                
                >Join as a Patient</h2>
                <p className="text-muted mb-4">
                  Take control of your health. Manage your medical history, prescriptions, and reports
                  securely on the blockchain — accessible anytime, anywhere.
                </p>
                <div className="d-flex align-items-center justify-content-center justify-content-md-start mb-4">
                  <img
                    src={img4}
                    alt="Stat Icon"
                    style={{ width: "35px", height: "35px" }}
                    className="me-2"
                  />
                  <h2 className="fw-bold mb-0"
                        style={{
                  color: "#182a53ff"
                }}
                  >{formatNumber(patientCount)}</h2>
                  <span className="ms-2 text-muted">Patients Registered</span>
                </div>
                <button
                  className="btn  btn-lg px-4 py-2 shadow-sm"

                   style={{
                  background: "#182a53ff",
                  color:"white"
                }}
                  onClick={() => navigate("/register-patient")}
                  disabled={!account}
                >
                  {account ? "Register as Patient" : "Connect Wallet First"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Doctor Section */}
        <section
          className="py-5 my-5 text-dark rounded shadow-sm"
          data-aos="fade-up"
          style={{
            background: "linear-gradient(135deg, #166d59ff, #edf1f2ff)",
          }}
        >
          <div className="container">
            <div className="row align-items-center flex-md-row-reverse">
              <div className="col-md-6 text-center mb-4 mb-md-0">
                <img
                  src={img3}
                  className="img-fluid rounded-4 shadow"
                  alt="Doctor Illustration"
                  style={{ maxHeight: "350px", objectFit: "cover" }}
                />
              </div>
              <div className="col-md-6 text-center text-md-start">
                <h2 className="fw-bold mb-3"
                style={{
                  color: "#165278ff"
                }}
                
                >Join as a Doctor</h2>
                <p className="text-muted mb-4">
                  Connect with your patients more efficiently. Access verified medical histories and
                  share prescriptions securely through the decentralized record wallet.
                </p>
                <div className="d-flex align-items-center justify-content-center justify-content-md-start mb-4">
                  <img
                    src={img4}
                    alt="Stat Icon"
                    style={{ width: "35px", height: "35px" }}
                    className="me-2"
                  />
                  <h2 className="fw-bold mb-0"
                  style={{
                  color: "#165278ff"
                }}

                  >{formatNumber(doctorCount)}</h2>
                  <span className="ms-2 text-muted">Doctors Registered</span>
                </div>
                <button
                  className="btn  btn-lg px-4 py-2 shadow-sm"
                  onClick={() => navigate("/register-doctor")}
                  disabled={!account}
                   style={{
                  background: "#165278ff",
                  color:"white"
                }}
                >
                  {account ? "Register as Doctor" : "Connect Wallet First"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Admin Section */}
        {account && adminAddress && account.toLowerCase() === adminAddress.toLowerCase() && (
          <section className="py-5 my-5 bg-light rounded shadow-sm text-center" data-aos="fade-up">
            <h3 className="text-success mb-4">Admin Access</h3>
            <button
              className="btn btn-success btn-lg px-5 py-3 shadow-sm"
              onClick={() => navigate("/admin-dashboard")}
            >
              Go to Admin Dashboard
            </button>
          </section>
        )}

        {/* Footer */}
        <footer className="py-3 bg-white text-center shadow-sm mt-auto">
          <small className="text-muted">
            © {new Date().getFullYear()} Medical Wallet DApp | Powered by Ethereum
          </small>
        </footer>
      </div>
    </div>
  );
}

export default Home;