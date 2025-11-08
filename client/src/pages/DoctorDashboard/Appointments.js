import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import MedicalWallet from "../../artifacts/MedicalWallet.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function DoctorAppointmentManager() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      setLoading(true);

      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const doctorAddress = await signer.getAddress();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

      const appts = await contract.getMyAppointments(); // doctor side storage
      function formatTime(hhmm) {
  let t = hhmm.toString().padStart(4, "0");
  let hours = parseInt(t.substring(0, 2));
  let mins = t.substring(2);
  let suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${mins} ${suffix}`;
}
      const formatted = await Promise.all(
        appts.map(async (a, i) => {
          // Get patient name
          let patientName = "Unknown";
          try {
            const p = await contract.getPatient(a.patient);
            patientName = p.name || "Unnamed Patient";
          } catch {}

          return {
            index: i,
            patient: a.patient,
            patientName,
            doctor: a.doctor,
            date: new Date(Number(a.date) * 1000).toLocaleDateString(),
          time: formatTime(a.time),

            status: ["Requested", "Approved", "Rejected"][a.status],
          };
        })
      );

      setAppointments(formatted);
      setLoading(false);
    } catch (err) {
      console.error("Load appointments error:", err);
      setLoading(false);
    }
  }

  async function approve(index) {
    try {
      setMessage("Approving...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

      const tx = await contract.approveAppointment(index);
      await tx.wait();

      setMessage("✅ Appointment approved!");
      loadAppointments();
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to approve.");
    }
  }

  async function reject(index) {
    try {
      setMessage("Rejecting...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

      const tx = await contract.rejectAppointment(index);
      await tx.wait();

      setMessage("❌ Appointment rejected.");
      loadAppointments();
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to reject.");
    }
  }
  

  return (
    <div className="container mt-4">
      <h3 className="fw-bold" style={{ background: "linear-gradient(135deg,#0d6efd,#198754)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Appointment Requests
      </h3>

      {message && <div className="alert alert-info mt-2">{message}</div>}

      {loading ? (
        <div className="text-center mt-4"><div className="spinner-border text-primary" /></div>
      ) : appointments.length === 0 ? (
        <p className="text-muted mt-3">No appointment requests yet.</p>
      ) : (
        <table className="table table-hover shadow-sm mt-3">
          <thead className="table-light">
            <tr>
              <th>Patient</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.index}>
                <td>{a.patientName}</td>
                <td>{a.date}</td>
                <td>{a.time}</td>
                <td>
                  <span
                    className={`badge ${
                      a.status === "Approved"
                        ? "bg-success"
                        : a.status === "Rejected"
                        ? "bg-danger"
                        : "bg-warning text-dark"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="text-center">
                  {a.status === "Requested" && (
                    <>
                      <button className="btn btn-sm btn-success me-2" onClick={() => approve(a.index)}>
                        ✅ Approve
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => reject(a.index)}>
                        ❌ Reject
                      </button>
                    </>
                  )}
                  {a.status !== "Requested" && <em>No action needed</em>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
export async function getAppointmentCount() {
  try {
    if (!window.ethereum) return 0;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

    const appts = await contract.getMyAppointments();
    return appts.length; // ✅ Total appointments (all statuses)
  } catch {
    return 0;
  }
}
