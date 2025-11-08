// src/components/DoctorProfile/DoctorViewProfile.js
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useParams } from "react-router-dom";
import MedicalWallet from "../../artifacts/MedicalWallet.json";
import logo from "../../images/img2.jpg";
import { useNavigate } from "react-router-dom";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/"
];

export default function DoctorViewProfile() {
  const { wallet } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
   const navigate = useNavigate();
  

  async function loadProfile() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, provider);

      const d = await contract.getDoctor(wallet);

      setDoctor({
        wallet,
        name: d.name,
        specialization: d.specialization,
        experience: Number(d.experience),
        licenseNumber: d.licenseNumber,
        ipfsHash: d.ipfsHash,
      });

      if (d.ipfsHash) {
        for (const gw of GATEWAYS) {
          try {
            const res = await fetch(gw + d.ipfsHash, { cache: "no-store" });
            if (!res.ok) continue;
            const j = await res.json();
            setMeta(j);
            break;
          } catch {}
        }
      }
      setLoading(false);

    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading)
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" />
        <p className="mt-2 text-muted">Loading doctor profile...</p>
      </div>
    );

  if (!doctor)
    return <div className="alert alert-danger">Doctor not found</div>;

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
        
                  <button className="btn btn-outline-secondary" onClick={() => navigate("/")}>
                    ← Back to Home
                  </button>
                </div>
              </nav>
    <div className="container my-4" style={{ maxWidth: "900px" }}>
        
      
      {/* ✅ Title */}
      <h2
        className="text-center fw-bold mb-4"
        style={{
          
          color:"linear-gradient(135deg, #4d5c80ff, #c2dfeaff)"
        }}
      >
        Dr. {doctor.name}
      </h2>

      {/* ✅ PERSONAL / PROFESSIONAL CARD */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 12 }}>
        <div
          className="card-header text-white py-3"
          style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <h5 className="mb-0">
            <i className="bi bi-person-badge me-2" />
            Profile Overview
          </h5>
        </div>

        <div className="card-body p-4">
          <div className="row">
            {/* Photo */}
            <div className="col-md-3 text-center">
              {meta?.photo ? (
                <img
                  src={meta.photo}
                  className="rounded-circle shadow"
                  style={{ width: 130, height: 130, objectFit: "cover" }}
                  alt="Doctor"
                />
              ) : (
                <div
                  className="rounded-circle bg-light d-flex align-items-center justify-content-center shadow"
                  style={{ width: 130, height: 130 }}
                >
                  <i className="bi bi-person-circle fs-1 text-secondary" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="col-md-9 mt-3 mt-md-0">
              <div className="row g-2 small">
                <div className="col-6">
                  <span className="text-muted">Name</span>
                  <p className="fw-semibold mb-1">Dr. {doctor.name}</p>
                </div>
                <div className="col-6">
                  <span className="text-muted">Specialization</span>
                  <p className="fw-semibold mb-1">{doctor.specialization}</p>
                </div>
                <div className="col-6">
                  <span className="text-muted">Experience</span>
                  <p className="fw-semibold mb-1">{doctor.experience} Years</p>
                </div>
                <div className="col-6">
                  <span className="text-muted">License #</span>
                  <p className="fw-semibold mb-1">{doctor.licenseNumber}</p>
                </div>
                <div className="col-6">
                  <span className="text-muted">Contact</span>
                  <p className="fw-semibold mb-1">{meta?.contact || "Not Provided"}</p>
                </div>
                <div className="col-6">
                  <span className="text-muted">Hospital</span>
                  <p className="fw-semibold mb-1">{meta?.currentHospital || "Independent"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ EXPERIENCE CARD */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 12 }}>
       <div
          className="card-header text-white py-3"
          style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <h5 className="mb-0">
            <i className="bi bi-briefcase-fill me-2" /> Professional Experience
          </h5>
        </div>

        <div className="card-body p-4">
          {meta?.experienceHistory?.length ? (
            <ul className="list-group small">
              {meta.experienceHistory.map((e, i) => (
                <li
                  key={i}
                  className="list-group-item d-flex justify-content-between"
                  style={{ borderRadius: 8 }}
                >
                  <span className="fw-semibold">{e.hospital}</span>
                  <span>{e.position}</span>
                  <span className="badge bg-primary">
                    {e.years} yrs
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No experience listed.</p>
          )}
        </div>
      </div>

      {/* ✅ EDUCATION CARD */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 12 }}>
        <div
          className="card-header text-white py-3"
          style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <h5 className="mb-0">
            <i className="bi bi-mortarboard-fill me-2" />
            Education & Qualifications
          </h5>
        </div>

        <div className="card-body p-4">
          {meta?.educationList?.length ? (
            <ul className="list-group small">
              {meta.educationList.map((e, i) => (
                <li
                  key={i}
                  className="list-group-item d-flex justify-content-between"
                  style={{ borderRadius: 8 }}
                >
                  <span className="fw-semibold">{e.degree}</span>
                  <span>{e.institute}</span>
                  <span className="badge bg-primary">{e.year}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No education listed.</p>
          )}
        </div>
      </div>

      {/* ✅ DOCUMENTS CARD */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 12 }}>
        <div
          className="card-header text-white py-3"
          style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <h5 className="mb-0">
            <i className="bi bi-folder2-open me-2"></i>
            Documents
          </h5>
        </div>

        <div className="card-body p-4 small">

          {/* Certifications */}
          <h6 className="fw-semibold">Certifications</h6>
          {meta?.certifications?.length ? (
            meta.certifications.map((c, i) => (
              <div
                key={i}
                className="d-flex justify-content-between align-items-center p-2 border rounded mb-2 bg-white"
              >
                <span>{c.name}</span>
                <a
                  href={GATEWAYS[0] + c.hash}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm"
                >
                  View
                </a>
              </div>
            ))
          ) : (
            <p className="text-muted">No certifications uploaded</p>
          )}

          <hr />

          {/* ID Proof */}
          <h6 className="fw-semibold">ID Proof</h6>
          {meta?.idProof ? (
            <a
              href={meta.idProof}
              className="btn btn-outline-secondary btn-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              View ID Proof
            </a>
          ) : (
            <p className="text-muted">Not uploaded</p>
          )}

          <hr />

          {/* License */}
          <h6 className="fw-semibold">License Document</h6>
          {meta?.licenseDocument ? (
            <a
              href={meta.licenseDocument}
              className="btn btn-outline-secondary btn-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              View License
            </a>
          ) : (
            <p className="text-muted">Not uploaded</p>
          )}
        </div>
      </div>

    </div>
    </div>
  );
}
