import React, { useState } from "react";
import { ethers } from "ethers";
import MedicalWallet from "../../artifacts/MedicalWallet.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function BookAppointmentModal({ show, doctor, onClose, onBooked }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!show || !doctor) return null;

 async function submit() {
  try {
    setBusy(true);
    setError("");

    if (!date || !time) {
      setError("Please select date and time.");
      setBusy(false);
      return;
    }

    if (!window.ethereum) {
      setError("MetaMask not detected.");
      setBusy(false);
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);

    // Convert date & time
    const tsDate = Math.floor(new Date(date).getTime() / 1000); // UNIX timestamp
    const timeNumber = Number(time.replace(":", "")); // "14:30" -> 1430

    // ✅ Correct function name
    const tx = await contract.requestAppointment(
      doctor.wallet,    // doctor address
      tsDate,           // uint timestamp
      timeNumber        // uint HHMM
    );

    await tx.wait();

    onBooked && onBooked();
    alert("✅ Appointment requested! Waiting for doctor's approval.");
    onClose();
  } catch (err) {
    console.error(err);
    setError(err?.reason || err?.message || "Failed to request appointment");
  } finally {
    setBusy(false);
  }
}


  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header" style={{ background: "linear-gradient(135deg,#0d6efd,#198754)" }}>
            <h5 className="modal-title text-white">Book with Dr. {doctor.name}</h5>
            <button className="btn btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}

            <label className="form-label">Date</label>
            <input type="date" className="form-control mb-3" value={date} onChange={(e) => setDate(e.target.value)} />

            <label className="form-label">Time</label>
            <input type="time" className="form-control mb-3" value={time} onChange={(e) => setTime(e.target.value)} />

            <label className="form-label">Reason (optional)</label>
            <textarea className="form-control" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe your concern" />
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-success" onClick={submit} disabled={busy}>
              {busy ? "Requesting…" : "Request Appointment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
