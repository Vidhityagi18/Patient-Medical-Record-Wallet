import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import MedicalWallet from "../../artifacts/MedicalWallet.json";

const CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/"
];

export default function Appointments() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [doctorFiles, setDoctorFiles] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const patientWallet = await signer.getAddress();
      const contract = new ethers.Contract(CONTRACT, MedicalWallet.abi, signer);

      /** ✅ 1. Appointments */
      const list = await contract.getMyAppointments();
      const formatted = await Promise.all(
        list.map(async (appt) => {
          const doctorInfo = await contract.getDoctor(appt.doctor);
          return {
            doctor: appt.doctor,
            doctorName: doctorInfo.name,
            date: new Date(Number(appt.date) * 1000).toLocaleDateString(),
            time: formatTime(Number(appt.time)),
            status: getStatusText(Number(appt.status)),
          };
        })
      );
      setAppointments(formatted);

      /** ✅ 2. Treatments WITH doctor name */
      const rawTreatments = await contract.getPatientTreatments(patientWallet);
      const tList = [];
      for (let t of rawTreatments) {
        const doc = await contract.getDoctor(t.doctor);
        tList.push({
          doctor: doc.name || "(Unknown Doctor)",
          notes: t.notes,
          timestamp: t.timestamp,
        });
      }
      setTreatments(tList);

      /** ✅ 3. Prescriptions WITH doctor name */
      const rawPrescriptions = await contract.getPatientPrescriptions(patientWallet);
      const pList = [];
      for (let p of rawPrescriptions) {
        const doc = await contract.getDoctor(p.doctor);
        pList.push({
          doctor: doc.name || "(Unknown Doctor)",
          ipfsHash: p.ipfsHash,
          timestamp: p.timestamp,
        });
      }
      setPrescriptions(pList);

      /** ✅ 4. Doctor Uploaded Medical Files WITH doctor name */
      const doctorFileRaw = await contract.getPatientFiles(patientWallet);
      const doctorFileList = [];
      for (let f of doctorFileRaw) {
        const docInfo = await contract.getDoctor(f.doctor);
        doctorFileList.push({
          doctor: docInfo.name,
          wallet: f.doctor,
          ipfsHash: f.ipfsHash,
          timestamp: f.timestamp,
        });
      }
      setDoctorFiles(doctorFileList);

      /** ✅ 5. Pending access requests */
      const pending = await contract.getPendingRequests(patientWallet);
      const pendingList = [];
      for (let doc of pending) {
        const info = await contract.getDoctor(doc);
        pendingList.push({
          wallet: doc,
          name: info.name || "(Unknown Doctor)",
        });
      }
      setAccessRequests(pendingList);

      setLoading(false);
    } catch (err) {
      console.error("loadAll error:", err);
      setError("Failed to load data");
      setLoading(false);
    }
  }

  async function approveAccess(doctor) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT, MedicalWallet.abi, signer);

      const tx = await contract.approveMedicalAccess(doctor);
      await tx.wait();
      alert("✅ Doctor access approved!");
      loadAll();
    } catch (err) {
      alert("Failed to approve access");
    }
  }

  function bestGateway(hash) {
    return GATEWAYS[0] + hash;
  }

  function formatTime(num) {
    const str = num.toString().padStart(4, "0");
    return `${str.slice(0, 2)}:${str.slice(2)}`;
  }

  function getStatusText(code) {
    if (code === 0) return "Requested";
    if (code === 1) return "Approved";
    if (code === 2) return "Rejected";
    return "Unknown";
  }

  function formatDateTime(ts) {
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleString();
  }

  return (
    <div className="container mt-4">
      <h3 className="fw-bold mb-3"
      style={{
            color: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
   
          }}>My Appointments</h3>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-success" />
          <p className="text-muted">Loading...</p>
        </div>
      )}

      {/* ✅ 1: Appointment List */}
      {!loading && (
        <div className="card border-0 shadow mb-4">
          <div className="card-header bg-success text-white fw-bold"
          style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}>
            
            Appointment List
          </div>
          <div className="card-body">
            {appointments.length === 0 ? (
              <p className="text-muted">No appointments yet</p>
            ) : (
              <table className="table table-striped shadow-sm">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a, i) => (
                    <tr key={i}>
                      <td>Dr. {a.doctorName}</td>
                      <td>{a.date}</td>
                      <td>{a.time}</td>
                      <td>
                        {a.status === "Approved" && (
                          <span className="badge bg-success">Approved</span>
                        )}
                        {a.status === "Requested" && (
                          <span className="badge bg-warning text-dark">
                            Requested
                          </span>
                        )}
                        {a.status === "Rejected" && (
                          <span className="badge bg-danger">Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ✅ 2: Medical History + Doctor Files */}
      <div className="card border-0 shadow mb-4">
        <div className="card-header bg-primary text-white fw-bold"
        style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}>
          Appointment History & Medical Updates
        </div>
        <div className="card-body">
          {prescriptions.length === 0 &&
          treatments.length === 0 &&
          doctorFiles.length === 0 ? (
            <p className="text-muted">No history yet</p>
          ) : (
            <>
              {/* ✅ Prescriptions */}
              {prescriptions.length > 0 && (
                <>
                  <h5 className="fw-semibold text-dark">Prescriptions</h5>
                  {prescriptions.map((p, i) => (
                    <div key={i} className="border rounded p-2 mb-2">
                      <p><b>Added By:</b> Dr. {p.doctor}</p>
                      <p><b>Time:</b> {formatDateTime(p.timestamp)}</p>
                      <a
                        href={bestGateway(p.ipfsHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-primary btn-sm"
                      >
                        View Prescription
                      </a>
                    </div>
                  ))}
                </>
              )}

              {/* ✅ Treatments */}
              {treatments.length > 0 && (
                <>
                  <h5 className="fw-semibold text-dark mt-3">Treatment Notes</h5>
                  {treatments.map((t, i) => (
                    <div key={i} className="border rounded p-2 mb-2">
                      <p><b>Doctor:</b> Dr. {t.doctor}</p>
                      <p><b>Time:</b> {formatDateTime(t.timestamp)}</p>
                      <p><b>Notes:</b> {t.notes}</p>
                    </div>
                  ))}
                </>
              )}

              {/* ✅ Doctor Uploaded Files */}
              {doctorFiles.length > 0 && (
                <>
                  <h5 className="fw-semibold text-dark mt-3">
                    Medical Files Uploaded by Doctors
                  </h5>
                  {doctorFiles.map((f, i) => (
                    <div key={i} className="border rounded p-2 mb-2">
                      <p><b>Doctor:</b> Dr. {f.doctor}</p>
                      <p><b>Uploaded:</b> {formatDateTime(f.timestamp)}</p>

                      <a
                        href={bestGateway(f.ipfsHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-secondary btn-sm me-2"
                      >
                        View
                      </a>

                      <a
                        href={bestGateway(f.ipfsHash)}
                        download
                        className="btn btn-outline-dark btn-sm"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ✅ 3: Access Requests */}
      <div className="card border-0 shadow mb-5">
        <div className="card-header bg-warning fw-bold"
        style={{
            background: "linear-gradient(135deg, #182a53ff, #c2dfeaff)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            color:"white"
          }}>
          Doctors Requesting Access
        </div>
        <div className="card-body">
          {accessRequests.length === 0 ? (
            <p className="text-muted">No pending requests</p>
          ) : (
            accessRequests.map((doc, i) => (
              <div
                key={i}
                className="d-flex justify-content-between align-items-center border rounded p-2 mb-2"
              >
                <span>
                  Dr. {doc.name} ({doc.wallet.slice(0, 6)}...{doc.wallet.slice(-4)})
                </span>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => approveAccess(doc.wallet)}
                >
                  Approve Access
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

