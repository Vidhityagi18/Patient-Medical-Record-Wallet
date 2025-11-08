import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import MedicalWallet from "../artifacts/MedicalWallet.json";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import logo from "../images/img2.jpg";
import axios from "axios";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Helper function to upload files to backend → Pinata
// Helper function to upload files to backend → Pinata
// Helper function to upload files to backend → Pinata
async function uploadFilesToPinata(formData) {
  try {
    const res = await axios.post("http://localhost:5000/api/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      timeout: 30000, // 30 second timeout
    });
    console.log("📤 Upload response:", res.data);
    return res.data;
  } catch (err) {
    console.error("Upload error:", err.response?.data || err.message);
    throw new Error("Failed to upload files: " + (err.response?.data?.error || err.message));
  }
}

// Update the buildGatewayUrl function to handle local files
/*function buildGatewayUrl(hash, source = "ipfs") {
  if (!hash) return "";
  
  if (source === "local" || hash.startsWith("local_")) {
    return `http://localhost:5000/api/file/${hash}`;
  }
  
  return `https://cloudflare-ipfs.com/ipfs/${hash}`;
}*/
function RegisterPatient() {
  const [account, setAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    idType: "",
    idNumber: "",
    medicalConditions: "",
    recentTreatments: "",
    profilePhoto: null,
    medicalFiles: [],
    prescriptions: []
  });
  const [preview, setPreview] = useState({
    photoURL: "",
    medicalFiles: [],
    prescriptions: []
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ Connect wallet function defined at component level
  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask to continue");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  }

  // Call wallet connection on component mount
  useEffect(() => {
    connectWallet();
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      if (name === "profilePhoto") {
        const photo = files[0];
        setFormData({ ...formData, profilePhoto: photo });
        setPreview({ ...preview, photoURL: URL.createObjectURL(photo) });
      } else if (name === "medicalFiles") {
        setFormData({ ...formData, medicalFiles: [...files] });
        setPreview({ ...preview, medicalFiles: Array.from(files).map(f => f.name) });
      } else if (name === "prescriptions") {
        setFormData({ ...formData, prescriptions: [...files] });
        setPreview({ ...preview, prescriptions: Array.from(files).map(f => f.name) });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Handle patient registration
  // Handle patient registration
// Handle patient registration
async function handleRegister(e) {
  e.preventDefault();
  setError("");
  setLoading(true);
  
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

    // Prepare files to upload
    const ipfsFormData = new FormData();
    if (formData.profilePhoto) ipfsFormData.append("profilePhoto", formData.profilePhoto);
    formData.medicalFiles.forEach(file => ipfsFormData.append("medicalFiles", file));
    formData.prescriptions.forEach(file => ipfsFormData.append("prescriptions", file));

    // Upload to backend → Pinata
    const uploadResponse = await uploadFilesToPinata(ipfsFormData);
    const ipfsFiles = uploadResponse.files; // This now contains fieldName information
    console.log("Uploaded files with field names:", ipfsFiles);

    // Create proper metadata structure
    const metadata = {
      // Personal info
      name: formData.name,
      age: formData.age,
      gender: formData.gender,
      idType: formData.idType,
      idNumber: formData.idNumber,
      
      // Medical information
      medicalHistory: formData.medicalConditions ? [formData.medicalConditions] : [],
      currentTreatment: formData.recentTreatments ? [formData.recentTreatments] : [],
      condition: [],
      allergies: [],
      
      // Files - initialize as empty arrays
      documents: [],
      prescriptions: [],
      dob: "",
      contact: ""
    };

  // In handleRegister function - replace the file processing part:
// Process files - handle both IPFS and local sources
ipfsFiles.forEach(file => {
  console.log("🔍 Processing file:", file);
  
  const fileUrl = buildGatewayUrl(file.hash, file.source);
  
  if (file.fieldName === "profilePhoto") {
    metadata.photo = fileUrl;
    metadata.profilePhotoHash = file.hash;
    console.log("✅ Set as profile photo:", fileUrl);
  } else if (file.fieldName === "medicalFiles") {
    metadata.documents.push({
      name: file.name,
      hash: file.hash,
      source: file.source || "ipfs"
    });
    console.log("✅ Added to medical files");
  } else if (file.fieldName === "prescriptions") {
    metadata.prescriptions.push({
      name: file.name,
      hash: file.hash,
      source: file.source || "ipfs"
    });
    console.log("✅ Added to prescriptions");
  }
});

console.log("Final metadata documents:", metadata.documents);
console.log("Final metadata prescriptions:", metadata.prescriptions);

    // Upload metadata to IPFS
    const metadataRes = await axios.post("http://localhost:5000/api/uploadJSON", metadata);
    const metadataHash = metadataRes.data.hash;

    console.log("Metadata IPFS hash:", metadataHash);

    // Register patient on blockchain with the metadata hash
    const tx = await contract.registerPatient(
      formData.name,
      formData.age,
      formData.gender,
      formData.idType,
      formData.idNumber,
      metadataHash
    );
    
    await tx.wait();
    alert("✅ Patient registered successfully!");
    navigate("/patient");
    
  } catch (err) {
    console.error("Registration error:", err);
    setError("❌ Registration failed. Please try again.");
  } finally {
    setLoading(false);
  }
}

// Add this helper function
function buildGatewayUrl(hash) {
  if (!hash) return "";
  return `https://gateway.pinata.cloud/ipfs/${hash}`;  // CHANGED TO PINATA
}

  return (
    <div
     style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
      backgroundAttachment: "fixed",
      backgroundSize: "cover",
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

      {/* Registration Form */}
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
          <h2 className="text-center mb-4 fw-bold"

           style={{
                  color: "#182a53ff"
                }}
          >
            Patient Registration</h2>
          {error && <div className="alert alert-danger text-center">{error}</div>}

          <form onSubmit={handleRegister}>
            {/* Personal Info */}
            <h5 className="fw-bold mb-3 border-bottom pb-2"
             style={{
                  color: "#182a53ff"
                }}
            
            >Personal Information</h5>
            <div className="mb-3">
              <label className="form-label">Full Name *</label>
              <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label">Age *</label>
                <input type="number" name="age" className="form-control" value={formData.age} onChange={handleChange} required />
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Gender *</label>
                <select name="gender" className="form-select" value={formData.gender} onChange={handleChange} required>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Identity Type *</label>
                <select name="idType" className="form-select" value={formData.idType} onChange={handleChange} required>
                  <option value="">Select</option>
                  <option>Aadhaar Card</option>
                  <option>PAN Card</option>
                  <option>Driving Licence</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">Identity Number *</label>
              <input type="text" name="idNumber" className="form-control" value={formData.idNumber} onChange={handleChange} required />
            </div>

            {/* Medical History */}
            <h5 className="fw-bold mb-3 border-bottom pb-2"
             style={{
                  color: "#182a53ff"
                }}



            >Medical History (Optional)</h5>
            <div className="mb-3">
              <label className="form-label">Medical Conditions</label>
              <textarea name="medicalConditions" className="form-control" rows="3" value={formData.medicalConditions} onChange={handleChange}></textarea>
            </div>

            <div className="mb-4">
              <label className="form-label">Recent Treatments</label>
              <textarea name="recentTreatments" className="form-control" rows="3" value={formData.recentTreatments} onChange={handleChange}></textarea>
            </div>

            {/* File Uploads */}
            <h5 className="fw-bold  mb-3 border-bottom pb-2"
             style={{
                  color: "#182a53ff"
                }}
            
            >

              Upload Files (Optional)</h5>
            <div className="mb-3">
              <label className="form-label">Profile Photo</label>
              <input type="file" name="profilePhoto" className="form-control" accept="image/*" onChange={handleChange} />
              {preview.photoURL && (
                <div className="text-center mt-3">
                  <img src={preview.photoURL} alt="Profile Preview" className="rounded-circle shadow-sm" style={{ width: "120px", height: "120px", objectFit: "cover" }} />
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">Medical Records</label>
              <input type="file" name="medicalFiles" className="form-control" multiple onChange={handleChange} accept=".pdf,image/*" />
              {preview.medicalFiles.length > 0 && (
                <ul className="list-group list-group-flush mt-2">
                  {preview.medicalFiles.map((file, i) => <li key={i} className="list-group-item small">📄 {file}</li>)}
                </ul>
              )}
            </div>

            <div className="mb-4">
              <label className="form-label">Current Prescriptions</label>
              <input type="file" name="prescriptions" className="form-control" multiple onChange={handleChange} accept=".pdf,image/*" />
              {preview.prescriptions.length > 0 && (
                <ul className="list-group list-group-flush mt-2">
                  {preview.prescriptions.map((file, i) => <li key={i} className="list-group-item small">💊 {file}</li>)}
                </ul>
              )}
            </div>

            <button type="submit" className="btn btn-success w-100"
            style={{
                  background: "#182a53ff",
                  color:"white"
                }} 
            
            disabled={loading || !account}>
              {loading ? "Registering..." : "Register as Patient"}
            </button>
          </form>

          <div className="text-center mt-3">
            <button className="btn btn-outline-secondary btn-sm" 
             style={{
                  color: "#182a53ff"
                }}
            onClick={() => navigate("/")}>
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

export default RegisterPatient;
