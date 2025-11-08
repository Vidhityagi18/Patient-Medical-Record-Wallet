import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import MedicalWallet from "../artifacts/MedicalWallet.json";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import logo from "../images/img2.jpg";
import axios from "axios";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ✅ Upload files to Pinata Backend
async function uploadFilesToPinata(formData) {
  try {
    const res = await axios.post("http://localhost:5000/api/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.files; // [{name, hash, fieldName}]
  } catch (err) {
    console.error("Upload error:", err.response?.data || err.message);
    throw new Error("Failed to upload to IPFS");
  }
}

// ✅ Build file URL from IPFS hash
function buildGatewayUrl(hash) {
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
}

function RegisterDoctor() {
  const [account, setAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    experience: "",
    licenseNumber: "",
    photo: null,
    certifications: [],
    idProof: null,
    licenseDocument: null,
  });

  const [preview, setPreview] = useState({
    photoURL: "",
    certifications: [],
    idProof: "",
    licenseDocument: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ✅ Connect wallet once
  useEffect(() => {
    connectWallet();
  }, []);

  async function connectWallet() {
    if (!window.ethereum) return alert("Please install MetaMask to continue");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
  }

  // ✅ Handle form & files
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      if (name === "photo") {
        const f = files[0];
        setFormData({ ...formData, photo: f });
        setPreview({ ...preview, photoURL: URL.createObjectURL(f) });
      } else if (name === "certifications") {
        setFormData({ ...formData, certifications: [...files] });
        setPreview({ ...preview, certifications: [...files].map((x) => x.name) });
      } else if (name === "idProof") {
        const f = files[0];
        setFormData({ ...formData, idProof: f });
        setPreview({ ...preview, idProof: f.name });
      } else if (name === "licenseDocument") {
        const f = files[0];
        setFormData({ ...formData, licenseDocument: f });
        setPreview({ ...preview, licenseDocument: f.name });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // ✅ Submit
  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

      // ✅ Upload all documents
      const ipfsForm = new FormData();
      if (formData.photo) ipfsForm.append("photo", formData.photo);
      if (formData.idProof) ipfsForm.append("idProof", formData.idProof);
      if (formData.licenseDocument) ipfsForm.append("licenseDocument", formData.licenseDocument);
      formData.certifications.forEach((f) => ipfsForm.append("certifications", f));

      const ipfsFiles = await uploadFilesToPinata(ipfsForm);

      // ✅ Build Doctor Metadata JSON
      const metadata = {
        name: formData.name,
        specialization: formData.specialization,
        experience: formData.experience,
        licenseNumber: formData.licenseNumber,
        photo: "",
        certifications: [],
        idProof: "",
        licenseDocument: "",
      };

      ipfsFiles.forEach((file) => {
        const url = buildGatewayUrl(file.hash);

        if (file.fieldName === "photo") metadata.photo = url;
        if (file.fieldName === "idProof") metadata.idProof = url;
        if (file.fieldName === "licenseDocument") metadata.licenseDocument = url;
        if (file.fieldName === "certifications") {
          metadata.certifications.push({ name: file.name, url, hash: file.hash });
        }
      });

      // ✅ Upload metadata to Pinata
      const metaRes = await axios.post("http://localhost:5000/api/uploadJSON", metadata);
      const metadataHash = metaRes.data.hash;

      // ✅ Store on blockchain
      const tx = await contract.registerDoctor(
        formData.name,
        formData.specialization,
        formData.experience,
        formData.licenseNumber,
        metadataHash
      );

      await tx.wait();
      navigate("/doctor");

    } catch (err) {
      console.error(err);
      setError("❌ Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
       style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
      backgroundAttachment: "fixed",
      backgroundSize: "cover",
    }}
    >
      {/* ✅ SAME HEADER AS PATIENT */}
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
                   <button className="btn btn-success" onClick={connectWallet}>
                     Connect Wallet
                   </button>
                 ) : (
                   <span className="badge bg-light text-dark p-2">
                     Connected: {account.slice(0, 6)}...{account.slice(-4)}
                   </span>
                 )}
               </div>
             </div>
           </nav>

      {/* ✅ FORM SECTION (same style as patient) */}
      <div
        className="py-5 d-flex align-items-center justify-content-center"
        
      >
        <div className="card shadow-lg p-4" style={{
    maxWidth: "750px",
    width: "100%",
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.15)",   // transparent
    backdropFilter: "blur(12px)",              // glass effect
    border: "1px solid rgba(255,255,255,0.3)"
  }}>
          <h2 className="text-center mb-4  fw-bold"
                style={{
                  color: "#182a53ff"
                }}
          >Doctor Registration</h2>

          {error && <div className="alert alert-danger text-center">{error}</div>}

          <form onSubmit={handleRegister}>
            <h5 className="fw-bold  mb-3 border-bottom pb-2"
            style={{
                  color: "#182a53ff"
                }}>
              Professional Details
            </h5>

            <div className="mb-3">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="name"
                className="form-control"
                required
                onChange={handleChange}
              />
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Specialization *</label>
                <input
                  type="text"
                  name="specialization"
                  className="form-control"
                  required
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Experience (Years) *</label>
                <input
                  type="number"
                  name="experience"
                  className="form-control"
                  required
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">License Number *</label>
              <input
                type="text"
                name="licenseNumber"
                className="form-control"
                required
                onChange={handleChange}
              />
            </div>

            <h5 className="fw-bold  mb-3 border-bottom pb-2"
            style={{
                  color: "#182a53ff"
                }}>
              Upload Documents
            </h5>

            <div className="mb-3">
              <label className="form-label">Profile Photo</label>
              <input type="file" name="photo" className="form-control" accept="image/*" onChange={handleChange} />
              {preview.photoURL && (
                <div className="text-center mt-3">
                  <img
                    src={preview.photoURL}
                    alt="Preview"
                    className="rounded-circle shadow-sm"
                    style={{ width: "120px", height: "120px", objectFit: "cover" }}
                  />
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">Certifications</label>
              <input type="file" name="certifications" className="form-control" multiple onChange={handleChange} accept=".pdf,image/*" />
            </div>

            <div className="mb-3">
              <label className="form-label">ID Proof</label>
              <input type="file" name="idProof" className="form-control" accept=".pdf,image/*" onChange={handleChange} />
            </div>

            <div className="mb-4">
              <label className="form-label">License Document</label>
              <input type="file" name="licenseDocument" className="form-control" accept=".pdf,image/*" onChange={handleChange} />
            </div>

            <button type="submit" className="btn w-100" 
            style={{
                  background: "#182a53ff",
                  color:"white"
                }} disabled={loading || !account}>
              {loading ? "Registering..." : "Register as Doctor"}
            </button>
          </form>

          <div className="text-center mt-3">
            <button className="btn btn-outline-secondary btn-sm"
            style={{
                  color: "#182a53ff"
                }} onClick={() => navigate("/")}>
              ← Back to Home
            </button>
          </div>

          <div className="text-muted text-center mt-3" style={{ fontSize: "0.9rem" }}>
            Connected Wallet:{" "}
            {account ? <span className="text-dark">{account.slice(0, 6)}...{account.slice(-4)}</span> : "Not connected"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterDoctor;
