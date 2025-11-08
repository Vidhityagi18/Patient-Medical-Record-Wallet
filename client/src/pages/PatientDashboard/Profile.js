// src/components/PatientDashboard/Profile.js
import React, { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import MedicalWallet from "../../artifacts/MedicalWallet.json";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import "./Profile.css"; 
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
];

export default function Profile({ onDataLoad })  {
  const [account, setAccount] = useState("");
  const [patientOnChain, setPatientOnChain] = useState(null);
  const [ipfsMeta, setIpfsMeta] = useState(null);
  const [filesForDisplay, setFilesForDisplay] = useState({
    profilePhoto: null,
    medicalFiles: [],
    prescriptions: [],
  });
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  // Modal states
  const [showEditPersonal, setShowEditPersonal] = useState(false);
  const [dobInput, setDobInput] = useState("");
  const [contactInput, setContactInput] = useState("");

  const [showAddMedicalHistory, setShowAddMedicalHistory] = useState(false);
  const [newMedicalHistory, setNewMedicalHistory] = useState("");

  const [showAddCurrentTreatment, setShowAddCurrentTreatment] = useState(false);
  const [newCurrentTreatment, setNewCurrentTreatment] = useState("");

  const [showAddCondition, setShowAddCondition] = useState(false);
  const [newCondition, setNewCondition] = useState("");

  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [newAllergy, setNewAllergy] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fileInputRefs = {
    profilePhoto: useRef(),
    medicalFiles: useRef(),
    prescriptions: useRef(),
    replaceSingle: useRef(),
  };

  useEffect(() => {
    if (patientOnChain && ipfsMeta && onDataLoad) {
      console.log("📤 Sending patient data to dashboard");
      onDataLoad(patientOnChain, ipfsMeta);
    }
  }, [patientOnChain, ipfsMeta, onDataLoad]);
  
  useEffect(() => {
    loadProfile();
  }, []);
  

  async function loadProfile() {
    setLoading(true);
    setError("");
    setStatusMsg("");

    try {
      if (!window.ethereum) {
        setError("MetaMask not detected. Please install/connect MetaMask.");
        setLoading(false);
        return;
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const userAddress = accounts[0];
      setAccount(userAddress);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

      const p = await contract.getPatient(userAddress);
      const onChain = {
        name: p.name || "",
        age: Number(p.age) || "",
        gender: p.gender || "",
        idType: p.idType || "",
        idNumber: p.idNumber || "",
        ipfsHash: p.ipfsHash || "",
      };
      setPatientOnChain(onChain);

      if (onChain.ipfsHash && onChain.ipfsHash.trim() !== "") {
        let meta = null;
        for (const gateway of GATEWAYS) {
          try {
            const url = `${gateway}${onChain.ipfsHash}`;
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) continue;

            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json") || ct.includes("text/plain")) {
              try {
                meta = await res.json();
                console.log("Fetched IPFS metadata raw:", meta);
              

              } catch {
                meta = null;
              }
            } else {
              meta = null;
              setFilesForDisplay({
                profilePhoto: { name: "Profile / Uploaded file", url },
                medicalFiles: [],
                prescriptions: [],
              });
            }

            if (meta) normalizeAndSetMeta(meta, onChain.ipfsHash);
            break;
          } catch {
            continue;
          }
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading profile:", err);
      setError(err.message || "Failed to load profile");
      setLoading(false);
    }
  }
function normalizeAndSetMeta(meta, hashOfMeta) {
  console.log("🔍 RAW METADATA FROM IPFS:", meta);
  console.log("🔍 DOB in raw meta:", meta.dob);
  console.log("🔍 Contact in raw meta:", meta.contact);
  
  const normalized = {
    name: meta.name || "",
    age: meta.age || "",
    gender: meta.gender || "",
    idType: meta.idType || "",
    idNumber: meta.idNumber || "",
    // FIX: Make sure these are properly set
    dob: meta.dob || "",  // This should be "2025-11-04"
    contact: meta.contact || "",  // This should be empty string
    medicalHistory: Array.isArray(meta.medicalHistory) ? meta.medicalHistory : [],
    currentTreatment: Array.isArray(meta.currentTreatment) ? meta.currentTreatment : [],
    condition: Array.isArray(meta.condition) ? meta.condition : [],
    allergies: Array.isArray(meta.allergies) ? meta.allergies : [],
    photo: meta.photo || "",
    profilePhotoHash: meta.profilePhotoHash || "",
    documents: Array.isArray(meta.documents) ? meta.documents : [],
    prescriptions: Array.isArray(meta.prescriptions) ? meta.prescriptions : [],
    metadataHash: hashOfMeta || "",
  };

  console.log("🔍 NORMALIZED METADATA:", normalized);
  console.log("🔍 DOB in normalized:", normalized.dob);
  console.log("🔍 Contact in normalized:", normalized.contact);

  setIpfsMeta(normalized);
  
  // Rest of your file processing code...
  const profilePhoto = normalized.photo ? { 
    name: "Profile Photo", 
    url: normalized.photo 
  } : null;

  const medicalFilesList = normalized.documents.map(doc => ({
    name: doc.name || "Medical File",
    url: `https://gateway.pinata.cloud/ipfs/${doc.hash}`
  }));

  const prescriptionsList = normalized.prescriptions.map(pres => ({
    name: pres.name || "Prescription",
    url: `https://gateway.pinata.cloud/ipfs/${pres.hash}`
  }));

  setFilesForDisplay({
    profilePhoto,
    medicalFiles: medicalFilesList,
    prescriptions: prescriptionsList,
  });
}
  function buildGatewayUrl(hash) {
    if (!hash) return "";
    return `https://cloudflare-ipfs.com/ipfs/${hash}`;
  }

  function triggerFileInput(field, multiple = false) {
    const ref = fileInputRefs[field];
    if (!ref) return;
    if (ref.current) {
      ref.current.multiple = !!multiple;
      ref.current.click();
    }
  }

  async function handleFilesChosen(e, field) {
    const chosen = e.target.files;
    if (!chosen || chosen.length === 0) return;
    setStatusMsg("Uploading file(s) to IPFS...");
    try {
      const fd = new FormData();
      if (field === "profilePhoto") fd.append("profilePhoto", chosen[0]);
      else Array.from(chosen).forEach((f) => fd.append(field, f));

      const res = await axios.post("http://localhost:5000/api/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!res?.data?.files) throw new Error("Upload response missing");

      await integrateUploadsToMeta(res.data.files, field);
      setStatusMsg("Files uploaded and metadata updated locally.");
    } catch (err) {
      console.error("Upload error:", err);
      setError("File upload failed. See console.");
    } finally {
      if (fileInputRefs[field] && fileInputRefs[field].current) fileInputRefs[field].current.value = "";
      setTimeout(() => setStatusMsg(""), 2000);
    }
  }

 async function integrateUploadsToMeta(uploadedFiles, field) {
  const meta = ipfsMeta ? { ...ipfsMeta } : {
    photo: "", dob: "", contact: "", medicalHistory: [], currentTreatment: [], 
    condition: [], allergies: [], documents: [], prescriptions: [], metadataHash: ""
  };

  if (field === "profilePhoto") {
    const f = uploadedFiles[0];
    meta.photo = `https://gateway.pinata.cloud/ipfs/${f.hash}`;  // CHANGED TO PINATA
    meta.profilePhotoHash = f.hash;
    setFilesForDisplay((prev) => ({ 
      ...prev, 
      profilePhoto: { name: f.name, url: `https://gateway.pinata.cloud/ipfs/${f.hash}` }  // CHANGED TO PINATA
    }));
  } else if (field === "medicalFiles") {
    uploadedFiles.forEach((f) => {
      meta.documents.push({ name: f.name, hash: f.hash });
      setFilesForDisplay((prev) => ({
        ...prev,
        medicalFiles: [...prev.medicalFiles, { 
          name: f.name, 
          url: `https://gateway.pinata.cloud/ipfs/${f.hash}`  // CHANGED TO PINATA
        }],
      }));
    });
  } else if (field === "prescriptions") {
    uploadedFiles.forEach((f) => {
      meta.prescriptions.push({ name: f.name, hash: f.hash });
      setFilesForDisplay((prev) => ({
        ...prev,
        prescriptions: [...prev.prescriptions, { 
          name: f.name, 
          url: `https://gateway.pinata.cloud/ipfs/${f.hash}`  // CHANGED TO PINATA
        }],
      }));
    });
  }

  setIpfsMeta(meta);
  // ... rest of your code
}

 async function handleUpdateDetailsToIPFS() {
  if (!ipfsMeta) return setError("No metadata to upload.");
  setStatusMsg("Pinning metadata JSON to IPFS...");
  
  try {
    // Upload updated metadata to IPFS
    const res = await axios.post("http://localhost:5000/api/uploadJSON", ipfsMeta);
    const newHash = res.data.hash;
    
    // Update local state
    setIpfsMeta((m) => ({ ...m, metadataHash: newHash }));
    setPatientOnChain((p) => ({ ...p, ipfsHash: newHash }));
    
    // Also update blockchain with new hash
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);
      
      // Check if updatePatientHash function exists
      if (typeof contract.updatePatientHash === "function") {
        const tx = await contract.updatePatientHash(newHash);
        setStatusMsg("Updating blockchain with new IPFS hash...");
        await tx.wait();
        setStatusMsg("✅ Details updated to IPFS and blockchain!");
      } else {
        setStatusMsg("✅ Details updated to IPFS (blockchain update not available)");
      }
    }
  } catch (err) {
    console.error("Update error:", err);
    setError("Failed to update details: " + (err.message || "Unknown error"));
  } finally {
    setTimeout(() => setStatusMsg(""), 3000);
  }
}

  async function handleSyncToBlockchain() {
    if (!patientOnChain?.ipfsHash) return setError("No IPFS metadata hash to sync.");
    try {
      if (!window.ethereum) return setError("MetaMask not detected.");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

      if (typeof contract.updatePatientHash === "function") {
        const tx = await contract.updatePatientHash(patientOnChain.ipfsHash);
        setStatusMsg("Waiting for blockchain confirmation...");
        await tx.wait();
        setStatusMsg("Blockchain synced.");
      } else {
        setStatusMsg("Contract missing updatePatientHash function. Metadata pinned locally.");
      }
    } catch (err) {
      console.error("Blockchain sync failed:", err);
      setError(err.message || "Blockchain update failed");
    }
  }

  const hasProfilePhoto = !!filesForDisplay.profilePhoto;
  const hasMedicalFiles = filesForDisplay.medicalFiles?.length > 0;
  const hasPrescriptions = filesForDisplay.prescriptions?.length > 0;
  

  return (
    <div className="container my-5">
      {/* Header */}
       <div className="text-center mb-5">
        <h2 className="fw-bold text-gradient mb-3" style={{background: "linear-gradient(135deg, #198754, #0d6efd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>
          Medical Profile
        </h2>
        <p className="text-muted">Manage your health records and personal information</p>
        {account && `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`}
      </div>
        
       

      {/* Loading State */}
      {loading && (
        <div className="text-center my-5 py-5">
          <div className="spinner-border text-primary mb-3" style={{width: "3rem", height: "3rem"}} role="status" />
          <div className="text-muted">Loading patient profile...</div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4 border-0 shadow-sm" role="alert">
          <div className="d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{error}</div>
          </div>
          <button type="button" className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}
      
      {statusMsg && (
        <div className="alert alert-info alert-dismissible fade show mb-4 border-0 shadow-sm" role="alert">
          <div className="d-flex align-items-center">
            <i className="bi bi-info-circle-fill me-2"></i>
            <div>{statusMsg}</div>
          </div>
          <button type="button" className="btn-close" onClick={() => setStatusMsg("")}></button>
        </div>
      )}

      {!loading && patientOnChain && (
        <>
          {/* Personal Information Card */}
          <div className="card mb-4 border-0 shadow-lg">
            <div className="card-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}
            
            >
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-semibold">
                  <i className="bi bi-person-badge me-2"></i>
                  Personal Information
                </h5>
                <div>
                  <button 
                    className="btn btn-light btn-sm me-2"
                    onClick={() => triggerFileInput("profilePhoto")}
                  >
                    <i className="bi bi-camera me-1"></i>
                    Change Photo
                  </button>
                  <button 
                     className="btn btn-sm"
  style={{
    border: "1px solid #182a53ff",
    color: "#182a53ff",
    background: "transparent"
  }}
                    onClick={() => {
                      setDobInput(ipfsMeta?.dob || "");
                      setContactInput(ipfsMeta?.contact || "");
                      setShowEditPersonal(true);
                    }}
                  >
                    <i className="bi bi-pencil me-1"></i>
                    Edit Info
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-3 text-center mb-4 mb-md-0">
                  {hasProfilePhoto ? (
                    <img 
                      src={filesForDisplay.profilePhoto.url} 
                      alt="profile" 
                      className="rounded-circle shadow"
                      style={{ width: 140, height: 140, objectFit: "cover", border: "4px solid #e3f2fd" }}
                    />
                  ) : (
                    <div className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto shadow"
                         style={{ width: 140, height: 140, border: "3px dashed #dee2e6" }}>
                      <i className="bi bi-person text-muted" style={{fontSize: "3rem"}}></i>
                    </div>
                  )}
                </div>
                <div className="col-md-9">
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <label className="text-muted small fw-semibold text-uppercase">Full Name</label>
                      <p className="fw-bold text-dark h5 mb-0">{patientOnChain.name || "Not provided"}</p>
                    </div>
                    <div className="col-sm-6">
                      <label className="text-muted small fw-semibold text-uppercase">Age</label>
                      <p className="fw-bold text-dark h5 mb-0">{patientOnChain.age || "Not provided"}</p>
                    </div>
                    <div className="col-sm-6">
                      <label className="text-muted small fw-semibold text-uppercase">Gender</label>
                      <p className="fw-bold text-dark h5 mb-0">{patientOnChain.gender || "Not provided"}</p>
                    </div>
                    <div className="col-sm-6">
                      <label className="text-muted small fw-semibold text-uppercase">Date of Birth</label>
                      <p className="fw-bold text-dark 6 mb-0">{ipfsMeta?.dob ? new Date(ipfsMeta.dob).toLocaleDateString() : "Not provided"}</p>
                    </div>
                    <div className="col-sm-6">
                      <label className="text-muted small fw-semibold text-uppercase">Contact</label>
                      <p className="fw-bold text-dark h6 mb-0">{ipfsMeta?.contact || "Not provided"}</p>
                    </div>
                    <div className="col-sm-6">
                      <label className="text-muted small fw-semibold text-uppercase">ID Verification</label>
                      <p className="fw-bold text-dark h6 mb-0">{patientOnChain.idType || "-"} / {patientOnChain.idNumber || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information Cards */}
          <div className="row g-4">
            {/* Medical History */}
            <div className="col-lg-6">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-header bg-light py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-semibold text-dark">
                      <i className="bi bi-clock-history me-2 text-primary"></i>
                      Medical History
                    </h6>
                    <button 
                                      className="btn btn-sm"
  style={{
    background: "linear-gradient(135deg, #182a53ff, #69c9ecff)",
    color: "white",
    border: "none"
  }}
         
                      onClick={() => setShowAddMedicalHistory(true)}
                    >
                      <i className="bi bi-plus-lg me-1"></i>
                      Add
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {ipfsMeta?.medicalHistory?.length ? (
                    <div className="list-group list-group-flush">
                      {ipfsMeta.medicalHistory.map((it, i) => (
                        <div key={i} className="list-group-item border-0 px-0 py-2 d-flex align-items-start">
                          <i className="bi bi-check-circle-fill text-success mt-1 me-2"></i>
                          <span className="text-dark">{it}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <i className="bi bi-inbox display-6 d-block mb-2 opacity-50"></i>
                      No medical history added
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Current Treatment */}
            <div className="col-lg-6">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-header bg-light py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-semibold text-dark">
                      <i className="bi bi-heart-pulse me-2 text-success"></i>
                      Current Treatment
                    </h6>
                    <button 
                                      className="btn btn-sm"
  style={{
    background: "linear-gradient(135deg, #182a53ff, #69c9ecff)",
    color: "white",
    border: "none"
  }}
         
                      onClick={() => setShowAddCurrentTreatment(true)}
                    >
                      <i className="bi bi-plus-lg me-1"></i>
                      Add
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {ipfsMeta?.currentTreatment?.length ? (
                    <div className="list-group list-group-flush">
                      {ipfsMeta.currentTreatment.map((it, i) => (
                        <div key={i} className="list-group-item border-0 px-0 py-2 d-flex align-items-start">
                          <i className="bi bi-capsule text-success mt-1 me-2"></i>
                          <span className="text-dark">{it}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <i className="bi bi-prescription display-6 d-block mb-2 opacity-50"></i>
                      No current treatment
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="col-lg-6">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-header bg-light py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-semibold text-dark">
                      <i className="bi bi-clipboard2-pulse me-2 text-info"></i>
                      Medical Conditions
                    </h6>
                    <button 
                                      className="btn btn-sm"
  style={{
    background: "linear-gradient(135deg, #182a53ff, #69c9ecff)",
    color: "white",
    border: "none"
  }}
         
                      onClick={() => setShowAddCondition(true)}
                    >
                      <i className="bi bi-plus-lg me-1"></i>
                      Add
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {ipfsMeta?.condition?.length ? (
                    <div className="list-group list-group-flush">
                      {ipfsMeta.condition.map((it, i) => (
                        <div key={i} className="list-group-item border-0 px-0 py-2">
                          <span className="badge bg-info text-white me-2">{i + 1}</span>
                          {it}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <i className="bi bi-clipboard-x display-6 d-block mb-2 opacity-50"></i>
                      No conditions added
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Allergies */}
            <div className="col-lg-6">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-header bg-light py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-semibold text-dark">
                      <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
                      Allergies
                    </h6>
                    <button 
                       className="btn btn-sm"
  style={{
    background: "linear-gradient(135deg, #182a53ff, #69c9ecff)",
    color: "white",
    border: "none"
  }}
                      onClick={() => setShowAddAllergy(true)}
                    >
                      <i className="bi bi-plus-lg me-1"></i>
                      Add
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {ipfsMeta?.allergies?.length ? (
                    <div className="list-group list-group-flush">
                      {ipfsMeta.allergies.map((it, i) => (
                        <div key={i} className="list-group-item border-0 px-0 py-2 d-flex align-items-start">
                          <i className="bi bi-shield-exclamation text-warning mt-1 me-2"></i>
                          <span className="text-dark">{it}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <i className="bi bi-shield-check display-6 d-block mb-2 opacity-50"></i>
                      No allergies recorded
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Documents */}
          <div className="card mt-4 border-0 shadow-lg">
            <div className="card-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-semibold">
                  <i className="bi bi-folder me-2"></i>
                  Medical Documents
                </h5>
                <div>
                  <button 
                    className="btn btn-light btn-sm me-2"
                    onClick={() => triggerFileInput("medicalFiles", true)}
                  >
                    <i className="bi bi-file-earmark-medical me-1"></i>
                    Medical Files
                  </button>
                  <button 
                                      className="btn btn-sm"
  style={{
    border: "1px solid #182a53ff",
    color: "#182a53ff",
    background: "transparent"
  }}
                    onClick={() => triggerFileInput("prescriptions", true)}
                  >
                    <i className="bi bi-prescription me-1"></i>
                    Prescriptions
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-4">
              <div className="row">
                <div className="col-md-6 mb-4">
                  <h6 className="fw-semibold text-dark mb-3 border-bottom pb-2">
                    <i className="bi bi-file-earmark-pdf me-2 text-primary"></i>
                    Medical Files ({filesForDisplay.medicalFiles.length})
                  </h6>
                  {hasMedicalFiles ? (
                    <div className="list-group">
                      {filesForDisplay.medicalFiles.map((f, i) => (
                        <div key={i} className="list-group-item border mb-2 rounded">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-file-earmark-text text-primary me-3 fs-5"></i>
                              <div>
                                <div className="fw-semibold text-dark">{f.name}</div>
                                <small className="text-muted">Medical Document</small>
                              </div>
                            </div>
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm"
  style={{
    background: "linear-gradient(135deg, #182a53ff, #69c9ecff)",
    color: "white",
    border: "none"
  }}>
                              <i className="bi bi-eye me-1"></i>
                              View
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border rounded bg-light">
                      <i className="bi bi-folder-x display-6 text-muted d-block mb-2 opacity-50"></i>
                      <p className="text-muted mb-0">No medical files uploaded</p>
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <h6 className="fw-semibold text-dark mb-3 border-bottom pb-2">
                    <i className="bi bi-prescription2 me-2 text-success"></i>
                    Prescriptions ({filesForDisplay.prescriptions.length})
                  </h6>
                  {hasPrescriptions ? (
                    <div className="list-group">
                      {filesForDisplay.prescriptions.map((f, i) => (
                        <div key={i} className="list-group-item border mb-2 rounded">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-prescription2 text-success me-3 fs-5"></i>
                              <div>
                                <div className="fw-semibold text-dark">{f.name}</div>
                                <small className="text-muted">Prescription</small>
                              </div>
                            </div>
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm"
  style={{
    background: "linear-gradient(135deg, #182a53ff, #69c9ecff)",
    color: "white",
    border: "none"
  }}>
                              <i className="bi bi-eye me-1"></i>
                              View
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border rounded bg-light">
                      <i className="bi bi-prescription display-6 text-muted d-block mb-2 opacity-50"></i>
                      <p className="text-muted mb-0">No prescriptions uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Controls */}
                    {/* Profile Controls */}
          <div className="card mt-4 border-0 shadow-lg">
           <div className="card-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
              <h5 className="mb-0 fw-semibold text-center">
                <i className="bi bi-gear-wide-connected me-2"></i>
                Profile Controls
              </h5>
            </div>
            <div className="card-body p-4 text-center">
              <div className="row g-3">
                <div className="col-md-4">
                  <button className="btn btn-outline-primary w-100" onClick={handleUpdateDetailsToIPFS}>
                    <i className="bi bi-cloud-upload me-1"></i>
                    Update to IPFS
                  </button>
                </div>
                <div className="col-md-4">
                  <button className="btn btn-outline-success w-100" onClick={handleSyncToBlockchain}>
                    <i className="bi bi-link-45deg me-1"></i>
                    Sync Blockchain
                  </button>
                </div>
                <div className="col-md-4">
                  <button className="btn btn-outline-danger w-100" onClick={() => setShowDeleteConfirm(true)}>
                    <i className="bi bi-trash me-1"></i>
                    Clear Local Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden file inputs - No changes */}
      <input ref={fileInputRefs.profilePhoto} type="file" accept="image/*" className="d-none" onChange={(e) => handleFilesChosen(e, "profilePhoto")} />
      <input ref={fileInputRefs.medicalFiles} type="file" accept=".pdf,image/*" multiple className="d-none" onChange={(e) => handleFilesChosen(e, "medicalFiles")} />
      <input ref={fileInputRefs.prescriptions} type="file" accept=".pdf,image/*" multiple className="d-none" onChange={(e) => handleFilesChosen(e, "prescriptions")} />
      <input ref={fileInputRefs.replaceSingle} type="file" accept=".pdf,image/*" className="d-none" onChange={(e) => handleFilesChosen(e, "medicalFiles")} />

      {/* Modals - Enhanced styling but same functionality */}
      {/* Edit Personal Info Modal */}
      
      <div className={`modal fade ${showEditPersonal ? "show d-block" : ""}`} tabIndex="-1">
        
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
             <div className="card-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
              <h5 className="modal-title">
                <i className="bi bi-person-gear me-2"></i>
                Edit Personal Information
              </h5>
            </div>
            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="form-label fw-semibold">Date of Birth</label>
                <input type="date" className="form-control border" value={dobInput} onChange={(e) => setDobInput(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Contact Information</label>
                <input type="text" className="form-control border" value={contactInput} onChange={(e) => setContactInput(e.target.value)} placeholder="Enter phone number or email" />
              </div>
            </div>
            <div className="modal-footer border-0">
              <button className="btn btn-outline-secondary" onClick={() => setShowEditPersonal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                const updatedMeta = {
                  ...ipfsMeta,
                  dob: dobInput,
                  contact: contactInput
                };
                setIpfsMeta(updatedMeta);
                setShowEditPersonal(false);
                setStatusMsg("Personal info updated locally. Click 'Update Details to IPFS' to save permanently.");
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      </div>

      {/* Keep all other modals with the same enhanced styling pattern */}
      {/* Add Medical History Modal */}
      <div className={`modal fade ${showAddMedicalHistory ? "show d-block" : ""}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
           <div className="modal-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
              <h5 className="modal-title">Add Medical History</h5>
            </div>
            <div className="modal-body p-4">
              <input type="text" className="form-control border" value={newMedicalHistory} onChange={(e) => setNewMedicalHistory(e.target.value)} placeholder="Enter medical history item" />
            </div>
            <div className="modal-footer border-0">
              <button className="btn btn-outline-secondary" onClick={() => setShowAddMedicalHistory(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                if (newMedicalHistory.trim() !== "") {
                  setIpfsMeta((m) => ({ ...m, medicalHistory: [...(m.medicalHistory||[]), newMedicalHistory] }));
                  setNewMedicalHistory("");
                }
                setShowAddMedicalHistory(false);
              }}>Add</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Current Treatment Modal */}
      <div className={`modal fade ${showAddCurrentTreatment ? "show d-block" : ""}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
             <div className="modal-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
              <h5 className="modal-title">Add Current Treatment</h5>
            </div>
            <div className="modal-body p-4">
              <input type="text" className="form-control border" value={newCurrentTreatment} onChange={(e) => setNewCurrentTreatment(e.target.value)} placeholder="Enter current treatment" />
            </div>
            <div className="modal-footer border-0">
              <button className="btn btn-outline-secondary" onClick={() => setShowAddCurrentTreatment(false)}>Cancel</button>
              <button className="btn btn-success" onClick={() => {
                if (newCurrentTreatment.trim() !== "") {
                  setIpfsMeta((m) => ({ ...m, currentTreatment: [...(m.currentTreatment||[]), newCurrentTreatment] }));
                  setNewCurrentTreatment("");
                }
                setShowAddCurrentTreatment(false);
              }}>Add</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Condition Modal */}
      <div className={`modal fade ${showAddCondition ? "show d-block" : ""}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
             <div className="modal-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
              <h5 className="modal-title">Add Condition</h5>
            </div>
            <div className="modal-body p-4">
              <input type="text" className="form-control border" value={newCondition} onChange={(e) => setNewCondition(e.target.value)} placeholder="Enter medical condition" />
            </div>
            <div className="modal-footer border-0">
              <button className="btn btn-outline-secondary" onClick={() => setShowAddCondition(false)}>Cancel</button>
              <button className="btn btn-info text-white" onClick={() => {
                if (newCondition.trim() !== "") {
                  setIpfsMeta((m) => ({ ...m, condition: [...(m.condition||[]), newCondition] }));
                  setNewCondition("");
                }
                setShowAddCondition(false);
              }}>Add</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Allergy Modal */}
      <div className={`modal fade ${showAddAllergy ? "show d-block" : ""}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
             <div className="modal-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
              <h5 className="modal-title">Add Allergy</h5>
            </div>
            <div className="modal-body p-4">
              <input type="text" className="form-control border" value={newAllergy} onChange={(e) => setNewAllergy(e.target.value)} placeholder="Enter allergy" />
            </div>
            <div className="modal-footer border-0">
              <button className="btn btn-outline-secondary" onClick={() => setShowAddAllergy(false)}>Cancel</button>
              <button className="btn btn-warning text-white" onClick={() => {
                if (newAllergy.trim() !== "") {
                  setIpfsMeta((m) => ({ ...m, allergies: [...(m.allergies||[]), newAllergy] }));
                  setNewAllergy("");
                }
                setShowAddAllergy(false);
              }}>Add</button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <div className={`modal fade ${showDeleteConfirm ? "show d-block" : ""}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-danger text-white">
              <h5 className="modal-title">Confirm Delete</h5>
            </div>
            <div className="modal-body p-4 text-center">
              <i className="bi bi-exclamation-triangle-fill text-danger display-4 d-block mb-3"></i>
              <p className="mb-0">Delete local metadata and reset profile preview? This will not change blockchain data.</p>
            </div>
            <div className="modal-footer border-0">
              <button className="btn btn-outline-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => {
                setIpfsMeta(null);
                setFilesForDisplay({ profilePhoto: null, medicalFiles: [], prescriptions: [] });
                setShowDeleteConfirm(false);
              }}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );}

