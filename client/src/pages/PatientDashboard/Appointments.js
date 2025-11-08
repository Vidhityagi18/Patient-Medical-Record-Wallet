import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import MedicalWallet from "../../artifacts/MedicalWallet.json";
import BookAppointmentModal from "./BookAppointmentModal";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
];

export default function ConsultDoctor() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]); // [{ wallet, name, specialization, experience, ipfsHash, meta? }]
  const [query, setQuery] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line
  }, []);

  async function loadDoctors() {
  try {
    setLoading(true);
    setError("");

    if (!window.ethereum) {
      setError("MetaMask not detected.");
      setLoading(false);
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, provider);

    // ✅ get wallets + doctor data together
    const [wallets, list] = await contract.getAllDoctorsWithAddresses();

    const formatted = await Promise.all(
      list.map(async (d, idx) => {
        const wallet = wallets[idx];

        const base = {
          wallet,
          name: d.name,
          specialization: d.specialization,
          experience: Number(d.experience),
          licenseNumber: d.licenseNumber,
          ipfsHash: d.ipfsHash,
          meta: null,
        };

        if (d.ipfsHash && d.ipfsHash.trim() !== "") {
          for (const gw of GATEWAYS) {
            try {
              const res = await fetch(gw + d.ipfsHash, { cache: "no-store" });
              if (!res.ok) continue;
              const ct = res.headers.get("content-type") || "";
              if (ct.includes("application/json") || ct.includes("text/plain")) {
                const meta = await res.json();
                base.meta = {
                  photo: meta.photo || "",
                  currentHospital: meta.currentHospital || "",
                  contact: meta.contact || "",
                };
                break;
              }
            } catch {}
          }
        }

        return base;
      })
    );

    setDoctors(formatted);
    setLoading(false);
  } catch (err) {
    console.error("loadDoctors error:", err);
    setError("Failed to load doctors");
    setLoading(false);
  }
}


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) => {
      const hospital = d.meta?.currentHospital || "";
      return (
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q) ||
        hospital.toLowerCase().includes(q)
      );
    });
  }, [query, doctors]);

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="fw-bold mb-0" style={{ background: "linear-gradient(135deg,#0d6efd,#198754)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Consult a Doctor
        </h3>
        <small className="text-muted">{filtered.length} doctor(s) found</small>
      </div>

      <input
        type="text"
        className="form-control shadow-sm mb-4"
        placeholder="Search by name, specialization, or hospital..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" />
          <div className="mt-2 text-muted">Loading doctors…</div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="alert alert-info">No doctors match your search.</div>
      )}

      <div className="row g-4">
        {filtered.map((doc, i) => (
          <div key={i} className="col-md-4">
            <div className="card shadow border-0 h-100">
              {/* header / photo */}
              <div
                className="p-3 d-flex align-items-center"
                style={{ background: "linear-gradient(135deg, #182a53ff, #7bbaf0ff)", borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
              >
                <div
  className="rounded-circle me-3"
  style={{
    width: 56,
    height: 56,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #e6eefb",
    overflow: "hidden",
    cursor: "pointer",
  }}
  onClick={() => window.location.href = `/doctor/${doc.wallet}`}   // ✅ redirect
>
  {doc.meta?.photo ? (
    <img
      src={doc.meta.photo}
      alt="doctor"
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  ) : (
    <span className="bi bi-person text-secondary" style={{ fontSize: 24 }} />
  )}
</div>

                <div>
                  <div className="fw-bold">Dr. {doc.name}</div>
                  <small className="text-muted">{doc.specialization}</small>
                </div>
              </div>

              {/* body */}
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <span className="badge bg-primary-subtle text-primary">
                    {doc.experience} yrs
                  </span>
                  {doc.meta?.currentHospital ? (
                    <span className="badge bg-success-subtle text-success">
                      {doc.meta.currentHospital}
                    </span>
                  ) : (
                    <span className="badge bg-secondary-subtle text-secondary">Independent</span>
                  )}
                </div>

                <div className="mt-3 small text-muted">
                  {doc.wallet !== "N/A" ? (
                    <>Wallet: {doc.wallet.slice(0, 6)}…{doc.wallet.slice(-4)}</>
                  ) : (
                    <>Wallet: —</>
                  )}
                </div>

                <button
                  className="btn w-100 mt-3"
                   style={{
    background: "linear-gradient(135deg, #182a53ff, #7bbaf0ff)",     // your custom color
    color: "white",
    border: "none"
  }}
                  onClick={() => {
                    setSelectedDoctor(doc);
                    setShowModal(true);
                  }}
                >
                  Request Appointment
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Book modal */}
      <BookAppointmentModal
        show={showModal}
        doctor={selectedDoctor}
        onClose={() => setShowModal(false)}
        onBooked={() => setShowModal(false)}
      />
    </div>
  );
}
