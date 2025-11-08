import React, { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import MedicalWallet from "../../artifacts/MedicalWallet.json";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import "./DoctorProfile.css";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/",
  // fallback - only try Pinata last
  "https://gateway.pinata.cloud/ipfs/"
];
async function fetchIPFSJson(hash) {
  for (const base of GATEWAYS) {
    try {
      const res = await fetch(base + hash, { mode: "cors" });
      if (res.ok) return await res.json();
    } catch {}
  }
  return null; // avoid crash 
}

export default function DoctorProfile({ onDataLoad }) {
  const [account, setAccount] = useState("");
  const [doctorChain, setDoctorChain] = useState(null);
  const [ipfsMeta, setIpfsMeta] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const [files, setFiles] = useState({
    profilePhoto: null,
    certifications: [],
    idProof: null,
    licenseDocument: null,
  });

  // Modal States
  const [showEditProfessional, setShowEditProfessional] = useState(false);
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [showAddEducation, setShowAddEducation] = useState(false);

  // Form Inputs
  const [contactInput, setContactInput] = useState("");
  const [hospitalInput, setHospitalInput] = useState("");
  const [educationInput, setEducationInput] = useState("");
  const [experienceInput, setExperienceInput] = useState("");

  // Experience Modal Inputs
  const [expHospital, setExpHospital] = useState("");
  const [expPosition, setExpPosition] = useState("");
  const [expYears, setExpYears] = useState("");

  // Education Modal Inputs
  const [eduDegree, setEduDegree] = useState("");
  const [eduInstitute, setEduInstitute] = useState("");
  const [eduYear, setEduYear] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
const [previewFile, setPreviewFile] = useState(null);

  const uploadRef = {
    profilePhoto: useRef(),
    certifications: useRef(),
    idProof: useRef(),
    licenseDocument: useRef(),
  };

  useEffect(() => {
    loadProfile();
  }, []);

 async function loadProfile() {
  try {
    setLoading(true);
    if (!window.ethereum) return;

    await window.ethereum.request({ method: "eth_requestAccounts" });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    setAccount(addr);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);
    const data = await contract.getDoctor(addr);

    const onChain = {
      name: data.name,
      specialization: data.specialization,
      experience: Number(data.experience),
      licenseNumber: data.licenseNumber,
      ipfsHash: data.ipfsHash,
    };
    setDoctorChain(onChain);

    if (onChain.ipfsHash) {
      const meta = await fetchIPFSJson(onChain.ipfsHash);

      if (meta) {
        const normalized = {
          photo: meta.photo || "",
          contact: meta.contact || "",
          currentHospital: meta.currentHospital || "",
          educationList: meta.educationList || [],
          experienceHistory: meta.experienceHistory || [],
          certifications: meta.certifications || [],
          idProof: meta.idProof || "",
          licenseDocument: meta.licenseDocument || "",
        };

        setIpfsMeta(normalized);

        setFiles({
          profilePhoto: normalized.photo ? { url: normalized.photo } : null,
          idProof: normalized.idProof ? { url: normalized.idProof } : null,
          licenseDocument: normalized.licenseDocument ? { url: normalized.licenseDocument } : null,
          certifications: normalized.certifications.map(c => ({
            name: c.name,
            url: GATEWAYS[0] + c.hash,
          })),
        });

        if (onDataLoad) onDataLoad(onChain, normalized);
      }
    }

    setLoading(false);
  } catch (err) {
    console.error("Doctor load error:", err);
    setLoading(false);
  }
}


  function triggerUpload(field, multiple = false) {
    const ref = uploadRef[field];
    if (ref?.current) {
      ref.current.multiple = multiple;
      ref.current.click();
    }
  }

  async function handleFilePick(e, field) {
    const chosen = e.target.files;
    if (!chosen.length) return;

    setStatusMsg("Uploading...");
    const fd = new FormData();

    if (field === "profilePhoto") fd.append("photo", chosen[0]);
    if (field === "idProof") fd.append("idProof", chosen[0]);
    if (field === "licenseDocument") fd.append("licenseDocument", chosen[0]);
    if (field === "certifications") Array.from(chosen).forEach(f => fd.append("certifications", f));

    try {
      const res = await axios.post("http://localhost:5000/api/upload", fd);
      const uploaded = res.data.files;

      addUploadToMetadata(uploaded);

      setStatusMsg("Uploaded!");
      setTimeout(() => setStatusMsg(""), 2000);
    } catch (err) {
      console.error("Upload error:", err);
      setStatusMsg("Upload failed");
    }
  }

  function addUploadToMetadata(uploaded) {
    const meta = { ...ipfsMeta };

    uploaded.forEach(file => {
     const url = GATEWAYS[0] + file.hash;


      if (file.fieldName === "photo") {
        meta.photo = url;
        setFiles(prev => ({ ...prev, profilePhoto: { name: file.name, url } }));
      }

      if (file.fieldName === "idProof") {
        meta.idProof = url;
        setFiles(prev => ({ ...prev, idProof: { name: file.name, url } }));
      }

      if (file.fieldName === "licenseDocument") {
        meta.licenseDocument = url;
        setFiles(prev => ({ ...prev, licenseDocument: { name: file.name, url } }));
      }

      if (file.fieldName === "certifications") {
        if (!meta.certifications) meta.certifications = [];
        meta.certifications.push({ name: file.name, hash: file.hash });

        setFiles(prev => ({
          ...prev,
          certifications: [...prev.certifications, { name: file.name, url }],
        }));
      }
    });

    setIpfsMeta(meta);
  }

  async function saveToIPFS() {
    if (!ipfsMeta) return;

    setStatusMsg("Saving to IPFS...");

    const res = await axios.post("http://localhost:5000/api/uploadJSON", ipfsMeta);
    const newHash = res.data.hash;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

 // ✅ If contract supports updateDoctorHash (recommended)
if (typeof contract.updateDoctorHash === "function") {
  const tx = await contract.updateDoctorHash(newHash);
  await tx.wait();
  setStatusMsg("✅ Profile updated on Blockchain + IPFS");
} else {
  setStatusMsg("⚠️ updateDoctorHash() not found in contract. Only IPFS updated.");
}


    setDoctorChain(prev => ({ ...prev, ipfsHash: newHash }));
    setStatusMsg("✅ Updated IPFS + Blockchain!");
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" />
        <p>Loading Doctor Profile...</p>
      </div>
    );
  }

  return (
    <div className="container my-5">

      <h2
  className="text-center fw-bold mb-4 profile-title"
>
  Profile
</h2>


      {statusMsg && <div className="alert alert-info text-center">{statusMsg}</div>}

      {/* PERSONAL + PROFESSIONAL INFO CARD */}
      {/* PERSONAL + PROFESSIONAL INFO CARD */}
<div className="card border-0 shadow-lg mb-4">
  <div  className="card-header text-white py-3"
          style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}>
    <div className="d-flex justify-content-between align-items-center">
      <h5 className="mb-0">
        <i className="bi bi-person-badge me-2"></i>
        Personal & Professional Info
      </h5>

      {/* ✅ Button group on right */}
      <div>
        <button
          className="btn btn-light btn-sm me-2"
          onClick={() => triggerUpload("profilePhoto")}
        >
          <i className="bi bi-camera"></i> Change Photo
        </button>

        <button
          className="btn btn-outline-light btn-sm"
          onClick={() => {
            setContactInput(ipfsMeta?.contact || "");
            setHospitalInput(ipfsMeta?.currentHospital || "");
            setShowEditProfessional(true);
          }}
        >
          <i className="bi bi-pencil"></i> Edit
        </button>
      </div>
    </div>
  </div>

  <div className="card-body">
    <div className="row">
      <div className="col-md-3 text-center">
        {files.profilePhoto ? (
          <img
            src={files.profilePhoto.url}
            className="rounded-circle shadow"
            style={{ width: 140, height: 140, objectFit: "cover" }}
            alt="Doctor"
          />
        ) : (
          <div
            className="rounded-circle bg-light d-flex align-items-center justify-content-center shadow"
            style={{ width: 140, height: 140 }}
          >
            <i className="bi bi-person-circle fs-1 text-secondary" />
          </div>
        )}
      </div>

      <div className="col-md-9">
        <div className="row g-2">
          <div className="col-md-6">
            <label className="text-muted small">Name</label>
            <p className="fw-bold">{doctorChain.name}</p>
          </div>

          <div className="col-md-6">
            <label className="text-muted small">Specialization</label>
            <p className="fw-bold">{doctorChain.specialization}</p>
          </div>

          <div className="col-md-6">
            <label className="text-muted small">Experience</label>
            <p className="fw-bold">{doctorChain.experience} Years</p>
          </div>

          <div className="col-md-6">
            <label className="text-muted small">License Number</label>
            <p className="fw-bold">{doctorChain.licenseNumber}</p>
          </div>

          <div className="col-md-6">
            <label className="text-muted small">Contact</label>
            <p className="fw-bold">{ipfsMeta?.contact || "Not Provided"}</p>
          </div>

          <div className="col-md-6">
            <label className="text-muted small">Current Hospital</label>
            <p className="fw-bold">{ipfsMeta?.currentHospital || "Not Provided"}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>


{/* ✅ ENHANCED EXPERIENCE CARD */}
{/* ✅ CLEAN PROFESSIONAL EXPERIENCE CARD */}
{/* ✅ PREMIUM PROFESSIONAL EXPERIENCE CARD */}
<div className="card border-0 shadow-lg mt-4 rounded-4">
 <div
          className="card-header text-white py-3"
          style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
    <div className="d-flex justify-content-between align-items-center">
      <h5 className="mb-0 fw-semibold">
        <i className="bi bi-briefcase-fill me-2"></i>
        Professional Experience
      </h5>

      <button
        className="btn btn-light btn-sm shadow-sm px-3"
        onClick={() => setShowAddExperience(true)}
      >
        <i className="bi bi-plus-lg me-1"></i> Add
      </button>
    </div>
  </div>

  <div className="card-body p-4">
    {ipfsMeta?.experienceHistory?.length ? (
      <div className="table-responsive">
        <table className="table table-striped table-hover align-middle text-center shadow-sm rounded-3"
               style={{ overflow: "hidden" }}>
          <thead className="table-light">
            <tr className="fw-semibold text-secondary">
              <th>🏥 Hospital</th>
              <th>🎓 Position</th>
              <th>📅 Years</th>
            </tr>
          </thead>
          <tbody>
            {ipfsMeta.experienceHistory.map((exp, i) => (
              <tr key={i} style={{ transition: "0.2s ease-in-out" }}>
                <td className="fw-bold text-dark">{exp.hospital}</td>
                <td>{exp.position}</td>
                <td>
                  <span className="badge bg-primary px-3 py-2">
                    {exp.years}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-center text-muted py-5">
        <i className="bi bi-briefcase display-5 opacity-50"></i>
        <p className="mt-2">No professional experience added</p>
      </div>
    )}
  </div>
</div>


{/* ✅ ENHANCED EDUCATION CARD */}
{/* ✅ PREMIUM EDUCATION CARD */}
<div className="card border-0 shadow-lg mt-4 rounded-4">
  <div
          className="card-header text-white py-3"
          style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
    <div className="d-flex justify-content-between align-items-center">
      <h5 className="mb-0 fw-semibold">
        <i className="bi bi-mortarboard-fill me-2"></i>
        Education & Qualifications
      </h5>

      <button
        className="btn btn-light btn-sm shadow-sm px-3"
        onClick={() => setShowAddEducation(true)}
      >
        <i className="bi bi-plus-lg me-1"></i> Add
      </button>
    </div>
  </div>

  <div className="card-body p-4">
    {ipfsMeta?.educationList?.length ? (
      <div className="row g-3">
        {ipfsMeta.educationList.map((edu, i) => (
          <div key={i} className="col-md-6 col-lg-4">
            <div
              className="p-3 rounded shadow-sm bg-white border"
              style={{
                transition: "0.2s",
                borderRadius: "15px",
                cursor: "default",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              <h6 className="fw-bold text-dark mb-1">{edu.degree}</h6>
              <small className="text-muted d-block">{edu.institute}</small>
              <span className="badge bg-success mt-1">Year: {edu.year}</span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center text-muted py-5">
        <i className="bi bi-journal-medical display-5 opacity-50"></i>
        <p className="mt-2">No education records available</p>
      </div>
    )}
  </div>
</div>




      {/* ✅ DOCUMENT CARD */}
     {/* ✅ ADVANCED DOCUMENT CARD WITH DELETE + MODAL PREVIEW */}
<div className="card border-0 shadow-lg mt-4 rounded-4">
  <div className="card-header d-flex justify-content-between align-items-center"
  style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
    <h5 className="mb-0 fw-semibold">
      <i className="bi bi-folder me-2"></i>
      Documents
    </h5>
    <div>
      <button className="btn btn-light btn-sm me-2 shadow-sm" onClick={() => triggerUpload("certifications", true)}>
        Certifications
      </button>
      <button className="btn btn-light btn-sm me-2 shadow-sm" onClick={() => triggerUpload("idProof")}>
        ID Proof
      </button>
      <button className="btn btn-light btn-sm shadow-sm" onClick={() => triggerUpload("licenseDocument")}>
        License
      </button>
    </div>
  </div>

  <div className="card-body">

    {/* ✅ CERTIFICATIONS GRID */}
    <h6 className="fw-semibold text-dark mb-3">
      <i className="bi bi-patch-check-fill text-primary me-1"></i>
      Certifications ({files.certifications.length})
    </h6>

    {files.certifications.length ? (
      <div className="row g-3">
        {files.certifications.map((cert, i) => (
          <div key={i} className="col-md-4">
            <div className="position-relative border rounded p-2 shadow-sm bg-light text-center doc-card">
              <div
                className="doc-thumb mb-2"
                style={{ height: "150px", overflow: "hidden", cursor: "pointer" }}
                onClick={() => {
                  setPreviewFile(cert.url);
                  setShowPreviewModal(true);
                }}
              >
                {cert.url.endsWith(".pdf") ? (
                  <i className="bi bi-file-earmark-pdf text-danger display-4"></i>
                ) : (
                  <img
                    src={cert.url}
                    alt="cert"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    className="hover-zoom"
                  />
                )}
              </div>

              <small className="fw-semibold d-block">{cert.name}</small>

              <div className="d-flex justify-content-between mt-2">
                <a href={cert.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm w-50 me-1"
                 style={{
    background: "linear-gradient(135deg, #182a53ff, #69c9ecff)",
    color: "white",
    border: "none"
  }}>
                  View
                </a>
                {/*className="btn btn-sm"
  style={{
    background: "linear-gradient(135deg, #182a53ff, #69c9ecff)",
    color: "white",
    border: "none"
  }}>*/}
                <button
                 className="btn btn-sm w-50 me-1"
                 style={{
    background: "linear-gradient(100deg, #c94958ff, #f36565ff)",
    color: "white",
    border: "none"
  }}
                  onClick={() => {
                    const updatedCerts = files.certifications.filter((_, idx) => idx !== i);
                    setFiles(prev => ({ ...prev, certifications: updatedCerts }));

                    const updatedMeta = {
                      ...ipfsMeta,
                      certifications: ipfsMeta.certifications.filter((_, idx) => idx !== i),
                    };
                    setIpfsMeta(updatedMeta);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-muted">No certifications uploaded</p>
    )}

    <hr className="my-4" />

    {/* ✅ ID & LICENSE */}
    <div className="row g-3">

      {/* ID */}
      <div className="col-md-6">
        <h6 className="fw-semibold text-dark mb-2">
          <i className="bi bi-person-vcard-fill text-success me-1"></i>
          ID Proof
        </h6>

        {files.idProof ? (
          <div
            className="p-2 border rounded bg-light shadow-sm text-center hover-zoom"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setPreviewFile(files.idProof.url);
              setShowPreviewModal(true);
            }}
          >
            <img
              src={files.idProof.url}
              alt="ID"
              style={{ width: "100%", height: "180px", objectFit: "contain" }}
            />
            <button
              className="btn  btn-sm w-100 mt-2"
              
                 style={{
    background: "linear-gradient(100deg, #c94958ff, #f36565ff)",
    color: "white",
    border: "none"
  }}
              onClick={() => {
                setFiles(prev => ({ ...prev, idProof: null }));
                setIpfsMeta(prev => ({ ...prev, idProof: "" }));
              }}
            >
              Delete
            </button>
          </div>
        ) : (
          <p className="text-muted">No ID uploaded</p>
        )}
      </div>

      {/* LICENSE */}
      <div className="col-md-6">
        <h6 className="fw-semibold text-dark mb-2">
          <i className="bi bi-patch-check-fill text-info me-1"></i>
          License
        </h6>

        {files.licenseDocument ? (
          <div
            className="p-2 border rounded bg-light shadow-sm text-center hover-zoom"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setPreviewFile(files.licenseDocument.url);
              setShowPreviewModal(true);
            }}
          >
            <img
              src={files.licenseDocument.url}
              alt="License"
              style={{ width: "100%", height: "180px", objectFit: "contain" }}
            />
            <button
             className="btn  btn-sm w-100 mt-2"
              
                 style={{
    background: "linear-gradient(100deg, #c94958ff, #f36565ff)",
    color: "white",
    border: "none"
  }}
              onClick={() => {
                setFiles(prev => ({ ...prev, licenseDocument: null }));
                setIpfsMeta(prev => ({ ...prev, licenseDocument: "" }));
              }}
            >
              Delete
            </button>
          </div>
        ) : (
          <p className="text-muted">No license uploaded</p>
        )}
      </div>

    </div>

  </div>
</div>



      {/* SAVE BUTTON */}
      <div className="text-center mt-4">
        <button className="btn btn-outline-success" onClick={saveToIPFS}>
          <i className="bi bi-cloud-upload me-2"></i>
          Save / Update to IPFS & Blockchain
        </button>
      </div>


      {/* Hidden Inputs */}
      <input ref={uploadRef.profilePhoto} type="file" className="d-none"
        onChange={(e) => handleFilePick(e, "profilePhoto")} />

      <input ref={uploadRef.certifications} type="file" accept=".pdf,image/*" multiple className="d-none"
        onChange={(e) => handleFilePick(e, "certifications")} />

      <input ref={uploadRef.idProof} type="file" accept=".pdf,image/*" className="d-none"
        onChange={(e) => handleFilePick(e, "idProof")} />

      <input ref={uploadRef.licenseDocument} type="file" accept=".pdf,image/*" className="d-none"
        onChange={(e) => handleFilePick(e, "licenseDocument")} />


      {/* MODAL – ADD EXPERIENCE */}
      <div className={`modal fade ${showAddExperience ? "show d-block" : ""}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
             <div className="modal-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
              <h5 className="modal-title">Add Past Experience</h5>
            </div>
            <div className="modal-body p-4">
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Hospital Name"
                value={expHospital}
                onChange={(e) => setExpHospital(e.target.value)}
              />
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Position"
                value={expPosition}
                onChange={(e) => setExpPosition(e.target.value)}
              />
              <input
                type="number"
                className="form-control"
                placeholder="Years"
                value={expYears}
                onChange={(e) => setExpYears(e.target.value)}
              />
            </div>
            <div className="modal-footer border-0">
              <button className="btn btn-outline-secondary" onClick={() => setShowAddExperience(false)}>Cancel</button>
              <button className="btn btn-primary"
                onClick={() => {
                  if (!expHospital || !expPosition || !expYears) return;
                  const updated = {
                    ...ipfsMeta,
                    experienceHistory: [
                      ...(ipfsMeta.experienceHistory || []),
                      { hospital: expHospital, position: expPosition, years: expYears }
                    ]
                  };
                  setIpfsMeta(updated);
                  setShowAddExperience(false);
                  setStatusMsg("Experience added locally. Click save to sync.");
                }}>
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* ✅ EDIT PERSONAL & CONTACT MODAL */}
<div className={`modal fade ${showEditProfessional ? "show d-block" : ""}`} tabIndex="-1">
  <div className="modal-dialog modal-dialog-centered">
    <div className="modal-content border-0 shadow-lg">
      <div className="modal-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
        <h5 className="modal-title">Edit Contact / Hospital Info</h5>
      </div>

      <div className="modal-body p-4">
        <label className="fw-semibold">Contact</label>
        <input
          type="text"
          className="form-control mb-3"
          value={contactInput}
          onChange={(e) => setContactInput(e.target.value)}
          placeholder="Phone or Email"
        />

        <label className="fw-semibold">Current Hospital</label>
        <input
          type="text"
          className="form-control"
          value={hospitalInput}
          onChange={(e) => setHospitalInput(e.target.value)}
          placeholder="Hospital Name"
        />
      </div>

      <div className="modal-footer border-0">
        <button className="btn btn-outline-secondary" onClick={() => setShowEditProfessional(false)}>
          Cancel
        </button>
        <button
          className="btn btn-success"
          onClick={() => {
            const updated = {
              ...ipfsMeta,
              contact: contactInput,
              currentHospital: hospitalInput,
            };
            setIpfsMeta(updated);
            setShowEditProfessional(false);
            setStatusMsg("✅ Updated locally. Click Save to sync with blockchain.");
          }}
        >
          Save
        </button>
      </div>
    </div>
  </div>
</div>
{/* ✅ FILE PREVIEW MODAL (supports PDF + Image) */}
{showPreviewModal && (
  <div className="modal show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.4)" }}>
    <div className="modal-dialog modal-dialog-centered modal-xl">
      <div className="modal-content border-0 shadow-lg">
        <div className="modal-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
          <h5 className="modal-title">Document Preview</h5>
          <button className="btn btn-close btn-close-white" onClick={() => setShowPreviewModal(false)}></button>
        </div>

        <div className="modal-body text-center p-3" style={{ minHeight: "70vh" }}>
          <div className="modal-body text-center p-3" style={{ minHeight: "70vh" }}>
  {previewFile.endsWith(".pdf") ? (
    <>
      {/* ✅ Try direct iframe first */}
      <iframe
        src={previewFile + "#toolbar=0"}
        title="PDF Preview"
        style={{ width: "100%", height: "70vh", border: "none" }}
        onError={(e) => {
          // ✅ If fails, switch to Google Docs Viewer
          e.target.src = `https://docs.google.com/gview?url=${previewFile}&embedded=true`;
        }}
      />
    </>
  ) : (
    <img
      src={previewFile}
      alt="preview"
      style={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
    />
  )}
</div>


        </div>

        <div className="modal-footer">
          <a href={previewFile} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Open in new tab
          </a>
          <button className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}



      {/* MODAL – ADD EDUCATION */}
      <div className={`modal fade ${showAddEducation ? "show d-block" : ""}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header py-3"
            style={{
            background: "linear-gradient(135deg, #182a53ff, #83d0ecff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
              <h5 className="modal-title">Add Education</h5>
            </div>
            <div className="modal-body p-4">
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Degree"
                value={eduDegree}
                onChange={(e) => setEduDegree(e.target.value)}
              />
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Institute"
                value={eduInstitute}
                onChange={(e) => setEduInstitute(e.target.value)}
              />
              <input
                type="number"
                className="form-control"
                placeholder="Year"
                value={eduYear}
                onChange={(e) => setEduYear(e.target.value)}
              />
            </div>
            <div className="modal-footer border-0">
              <button className="btn btn-outline-secondary" onClick={() => setShowAddEducation(false)}>Cancel</button>
              <button
                className="btn btn-success"
                onClick={() => {
                  if (!eduDegree || !eduInstitute || !eduYear) return;
                  const updated = {
                    ...ipfsMeta,
                    educationList: [
                      ...(ipfsMeta.educationList || []),
                      { degree: eduDegree, institute: eduInstitute, year: eduYear }
                    ]
                  };
                  setIpfsMeta(updated);
                  setShowAddEducation(false);
                  setStatusMsg("Education added locally. Click save to sync.");
                }}>
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
    
  );
}
