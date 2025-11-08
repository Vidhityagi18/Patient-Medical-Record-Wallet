// src/components/DoctorDashboard/MyPatients.js
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import MedicalWallet from "../../artifacts/MedicalWallet.json";

const CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
];

export default function MyPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [recordModal, setRecordModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const [treatments, setTreatments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  const [patientUploadedFiles, setPatientUploadedFiles] = useState([]);
  const [doctorUploadedFiles, setDoctorUploadedFiles] = useState([]);

  const [newNote, setNewNote] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDoctorFile, setUploadDoctorFile] = useState(null);

  async function fetchIPFS(hash) {
    for (let url of GATEWAYS) {
      try {
        const res = await fetch(url + hash, { cache: "no-store" });
        if (res.ok) return await res.json();
      } catch {}
    }
    return null;
  }

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const doctor = await signer.getAddress();
      const contract = new ethers.Contract(CONTRACT, MedicalWallet.abi, signer);

      const appts = await contract.getMyAppointments();
      const approved = appts.filter(a => Number(a.status) === 1);

      const list = [];
      for (let a of approved) {
        const wallet = a.patient;
        const p = await contract.getPatient(wallet);

        const obj = {
          wallet,
          name: p.name,
          age: Number(p.age),
          gender: p.gender,
          ipfsHash: p.ipfsHash,
          access: false,
          meta: null,
        };

        obj.access = await contract.doctorAccess(wallet, doctor);

        if (p.ipfsHash) {
          const meta = await fetchIPFS(p.ipfsHash);
          if (meta) obj.meta = meta;
        }

        list.push(obj);
      }
      setPatients(list);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  async function requestAccess(wallet) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT, MedicalWallet.abi, signer);

      const tx = await contract.requestMedicalAccess(wallet);
      await tx.wait();
      alert("✅ Access request sent!");
    } catch {
      alert("❌ Failed to request access");
    }
  }

  async function openRecord(p) {
    setSelected(p);
    await loadRecord(p.wallet);
    setRecordModal(true);
  }

  async function loadRecord(wallet) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT, MedicalWallet.abi, signer);

    const t = await contract.getPatientTreatments(wallet);
    const pr = await contract.getPatientPrescriptions(wallet);

    // ✅ Fetch doctor name for treatments
    const tFull = [];
    for (let tr of t) {
      const docInfo = await contract.getDoctor(tr.doctor);
      tFull.push({
        notes: tr.notes,
        timestamp: tr.timestamp,
        doctor: docInfo.name,
        wallet: tr.doctor,
      });
    }
    setTreatments(tFull);

    // ✅ Fetch doctor name for prescriptions
    const prFull = [];
    for (let prx of pr) {
      const docInfo = await contract.getDoctor(prx.doctor);
      prFull.push({
        ipfsHash: prx.ipfsHash,
        timestamp: prx.timestamp,
        doctor: docInfo.name,
        wallet: prx.doctor,
      });
    }
    setPrescriptions(prFull);

    // ✅ Patient uploaded (IPFS metadata)
    const p = await contract.getPatient(wallet);
    if (p.ipfsHash) {
      const meta = await fetchIPFS(p.ipfsHash);
      setPatientUploadedFiles([
        ...(meta.documents?.map(d => ({
          name: d.name,
          url: `https://gateway.pinata.cloud/ipfs/${d.hash}`,
        })) || []),
        ...(meta.prescriptions?.map(d => ({
          name: d.name,
          url: `https://gateway.pinata.cloud/ipfs/${d.hash}`,
        })) || []),
      ]);
    }

    // ✅ Doctor uploaded files
    const files = await contract.getPatientFiles(wallet);
    const docFiles = [];
    for (let f of files) {
      const docInfo = await contract.getDoctor(f.doctor);
      docFiles.push({
        doctor: docInfo.name,
        wallet: f.doctor,
        url: `https://gateway.pinata.cloud/ipfs/${f.ipfsHash}`,
        timestamp: f.timestamp,
      });
    }
    setDoctorUploadedFiles(docFiles);
  }

  async function addTreatmentNote() {
    if (!newNote.trim()) return alert("Write something!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT, MedicalWallet.abi, signer);

      const tx = await contract.addTreatment(selected.wallet, newNote);
      await tx.wait();
      setNewNote("");
      await loadRecord(selected.wallet);
      alert("✅ Treatment added!");
    } catch {
      alert("❌ Failed to add treatment");
    }
  }

  async function uploadPrescription() {
    if (!uploadFile) return alert("Select a file first");
    try {
      const fd = new FormData();
      fd.append("prescription", uploadFile);

      const res = await axios.post("http://localhost:5000/api/upload", fd);
      const hash = res.data.files[0].hash;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT, MedicalWallet.abi, signer);

      const tx = await contract.uploadPrescription(selected.wallet, hash);
      await tx.wait();

      setUploadFile(null);
      await loadRecord(selected.wallet);
      alert("✅ Prescription uploaded!");
    } catch {
      alert("❌ Upload failed");
    }
  }

  async function uploadDoctorMedicalFile() {
    if (!uploadDoctorFile) return alert("Select a file first");
    try {
      const fd = new FormData();
      fd.append("medicalfile", uploadDoctorFile);

      const res = await axios.post("http://localhost:5000/api/upload", fd);
      const hash = res.data.files[0].hash;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT, MedicalWallet.abi, signer);

      const tx = await contract.uploadDoctorFile(selected.wallet, hash);
      await tx.wait();

      setUploadDoctorFile(null);
      await loadRecord(selected.wallet);
      alert("✅ File uploaded!");
    } catch {
      alert("❌ Upload failed");
    }
  }

  function formatDate(ts) {
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleString();
  }

  return (
    <div className="container mt-4">
      <h3 className="fw-bold text-success mb-3">My Patients</h3>

      {loading && <p className="text-muted">Loading patients...</p>}

<div className="row g-4">
  {patients.map((p, i) => (
    <div key={i} className="col-md-4">
      <div
        className="card shadow-sm border-0 h-100"
        style={{ borderRadius: 12, overflow: "hidden" }}
      >
        {/* Header with slight color */}
        <div
          className="px-3 py-2"
          style={{
            background: "rgba(25,135,84,0.12)", // soft green tint
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          <div className="d-flex align-items-center">
            <img
              src={
                p.meta?.photo
                  ? p.meta.photo
                  : "https://cdn-icons-png.flaticon.com/512/847/847969.png"
              }
              alt="patient"
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid #ddd",
                background: "#fff",
                flexShrink: 0,
              }}
            />
            <div className="ms-3">
              <div className="fw-semibold" style={{ fontSize: 16 }}>
                {p.name}
              </div>
              <small className="text-muted">
                {p.wallet.slice(0, 6)}...{p.wallet.slice(-4)}
              </small>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="card-body pb-2" style={{ fontSize: 14 }}>
          <p className="mb-1">
            <b>Age:</b> {p.age}
          </p>
          <p className="mb-1">
            <b>Gender:</b> {p.gender}
          </p>

          {p.meta && (
            <>
              <p className="mb-1">
                <b>DOB:</b> {p.meta.dob || "N/A"}
              </p>
              <p className="mb-2">
                <b>Contact:</b> {p.meta.contact || "N/A"}
              </p>

              <b>Conditions:</b>
              <ul className="ps-3 mb-2">
                {p.meta.condition?.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>

              <b>Allergies:</b>
              <ul className="ps-3 mb-0">
                {p.meta.allergies?.map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer bg-white border-0 pt-0 pb-3 px-3">
          {!p.access ? (
            <>
              <p className="text-danger small mb-2">
                <b>Medical files locked.</b>
              </p>
              <button
                className="btn btn-outline-warning w-100"
                onClick={() => requestAccess(p.wallet)}
                style={{ borderRadius: 8 }}
              >
                Request Access
              </button>
            </>
          ) : (
            <button
              className="btn btn-outline-success w-100"
              onClick={() => openRecord(p)}
              style={{ borderRadius: 8 }}
            >
              View & Update Medical Record
            </button>
          )}
        </div>
      </div>
    </div>
  ))}
</div>




      {/* ✅ MODAL */}
    {recordModal && selected && (
  <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.45)" }}>
    <div className="modal-dialog modal-xl">
      <div className="modal-content border-0 shadow-lg rounded-3">

        {/* Header */}
        <div className="modal-header bg-white border-bottom">
          <h5 className="mb-0 text-success fw-bold">
            Medical Record – {selected.name}
          </h5>
          <button className="btn-close" onClick={() => setRecordModal(false)}></button>
        </div>

        {/* Scrollable body */}
        <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto", padding: "25px" }}>

          {/* ✅ Patient Uploaded Files */}
          <section className="mb-4">
            <h6 className="fw-semibold mb-3">
              📁 Patient Uploaded Files
            </h6>

            {patientUploadedFiles.length === 0
              ? <p className="text-muted ms-2">No patient uploads found.</p>
              : patientUploadedFiles.map((f, i) => (
                  <div key={i} className="d-flex justify-content-between align-items-center border rounded p-3 mb-2 shadow-sm bg-white">
                    <span className="fw-semibold">{f.name}</span>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-primary btn-sm"
                    >
                      View
                    </a>
                  </div>
                ))}
          </section>

          <hr />

          {/* ✅ Doctor Uploaded Files */}
          <section className="mb-4">
            <h6 className="fw-semibold mb-3">
              🩺 Doctor Uploaded Files
            </h6>

            {doctorUploadedFiles.length === 0
              ? <p className="text-muted ms-2">No doctor files uploaded yet.</p>
              : doctorUploadedFiles.map((f, i) => (
                  <div key={i} className="border rounded p-3 mb-2 shadow-sm bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <b>Doctor:</b> Dr. {f.doctor} <br />
                        <b>Date:</b> {formatDate(f.timestamp)}
                      </div>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-secondary btn-sm"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                ))}

            {/* Upload doctor medical file */}
            <label className="fw-semibold mt-3">Upload Medical File:</label>
            <input
              type="file"
              className="form-control mb-2"
              onChange={(e) => setUploadDoctorFile(e.target.files[0])}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={uploadDoctorMedicalFile}
            >
              Upload
            </button>
          </section>

          <hr />

          {/* ✅ Prescriptions */}
          <section className="mb-4">
            <h6 className="fw-semibold mb-3">
              💊 Prescriptions
            </h6>

            {prescriptions.length === 0
              ? <p className="text-muted ms-2">No prescriptions available.</p>
              : prescriptions.map((p, i) => (
                  <div key={i} className="border rounded p-3 mb-2 shadow-sm bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <b>Doctor:</b> Dr. {p.doctor} <br />
                        <b>Date:</b> {formatDate(p.timestamp)}
                      </div>

                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${p.ipfsHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-secondary btn-sm"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}

            <label className="fw-semibold mt-3">Upload Prescription:</label>
            <input
              type="file"
              className="form-control mb-2"
              onChange={(e) => setUploadFile(e.target.files[0])}
            />

            <button
              className="btn btn-secondary btn-sm"
              onClick={uploadPrescription}
            >
              Upload Prescription
            </button>
          </section>

          <hr />

          {/* ✅ Treatment Notes */}
          <section className="mb-4">
            <h6 className="fw-semibold mb-3">
              📝 Treatment Notes
            </h6>

            {treatments.length === 0
              ? <p className="text-muted ms-2">No treatments recorded.</p>
              : treatments.map((t, i) => (
                  <div key={i} className="border rounded p-3 mb-2 shadow-sm bg-white">
                    <b>Doctor:</b> Dr. {t.doctor} <br />
                    <b>Date:</b> {formatDate(t.timestamp)} <br />
                    <b>Note:</b> {t.notes}
                  </div>
                ))}

            <textarea
              className="form-control mt-2"
              placeholder="Write note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />

            <button
              className="btn btn-dark w-100 mt-2"
              onClick={addTreatmentNote}
            >
              Add Treatment Note
            </button>
          </section>

        </div>
      </div>
    </div>
  </div>
)}



    </div>
  );
}
export async function getPatientCount() {
  try {
    if (!window.ethereum) return 0;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const doctor = await signer.getAddress();
    const contract = new ethers.Contract(CONTRACT, MedicalWallet.abi, signer);

    const appts = await contract.getMyAppointments();
    const approved = appts.filter(a => Number(a.status) === 1);
    return approved.length; // ✅ Only approved become patients
  } catch {
    return 0;
  }
}

