// src/components/DoctorDashboard/Documents.js
import React from "react";

const Documents = ({ ipfsMeta }) => {
  if (!ipfsMeta) {
    return <div className="card p-4">Loading...</div>;
  }

  return (
    <div className="card p-4 shadow">
      <h3 className="fw-bold text-success">Uploaded Documents</h3>

      <h5 className="mt-3">Certifications:</h5>
      <ul>
        {ipfsMeta.certifications?.map((doc, index) => (
          <li key={index}>
            <a href={doc.url} target="_blank" rel="noreferrer">{doc.name}</a>
          </li>
        ))}
      </ul>

      <h5 className="mt-3">License Document:</h5>
      {ipfsMeta.licenseDocument ? (
        <a href={ipfsMeta.licenseDocument} target="_blank" rel="noreferrer">View License</a>
      ) : (
        <p>No License Uploaded</p>
      )}

      <h5 className="mt-3">ID Proof:</h5>
      {ipfsMeta.idProof ? (
        <a href={ipfsMeta.idProof} target="_blank" rel="noreferrer">View ID Proof</a>
      ) : (
        <p>No ID Proof Uploaded</p>
      )}
    </div>
  );
};

export default Documents;
