import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const router = express.Router();

// Temporary storage for uploads
const upload = multer({ dest: "uploads/" });

// Pinata keys
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;


// Accept multiple fields from frontend
router.post(
  "/upload",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "medicalFiles", maxCount: 10 },
    { name: "prescription", maxCount: 10 },
    { name: "prescriptions", maxCount: 10 },
     { name: "medicalfile", maxCount: 10 },
    { name: "photo", maxCount: 1 },
    { name: "certifications", maxCount: 10 },
    { name: "idProof", maxCount: 1 },
    { name: "licenseDocument", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const uploadedFiles = [];

      // Process each field separately to preserve field names
      for (const field of ["profilePhoto", "medicalFiles", "prescription", "prescriptions", "medicalfile","photo", "certifications", "idProof", "licenseDocument"]) {
        if (req.files[field]) {
          for (const file of req.files[field]) {
            console.log(`📤 Uploading ${field}: ${file.originalname}`);
            
            const data = new FormData();
            data.append("file", fs.createReadStream(file.path), file.originalname);

            try {
              const pinataRes = await axios.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                data,
                {
                  maxBodyLength: 50 * 1024 * 1024, // 50MB max
                  maxContentLength: 50 * 1024 * 1024, // 50MB max
                  timeout: 30000, // 30 second timeout
                  headers: {
                    ...data.getHeaders(),
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_SECRET_API_KEY,
                  },
                }
              );

              uploadedFiles.push({
                fieldName: field,
                name: file.originalname,
                hash: pinataRes.data.IpfsHash,
              });

              console.log(`✅ Uploaded: ${file.originalname} -> ${pinataRes.data.IpfsHash}`);
            } catch (uploadErr) {
              console.error(`❌ Failed to upload ${file.originalname}:`, uploadErr.message);
              // Continue with other files instead of failing completely
              continue;
            } finally {
              // Clean up temp file
              try {
                if (fs.existsSync(file.path)) {
                  fs.unlinkSync(file.path);
                }
              } catch (cleanupErr) {
                console.error("Cleanup error:", cleanupErr.message);
              }
            }
          }
        }
      }

      if (uploadedFiles.length === 0) {
        return res.status(400).json({ success: false, error: "No files were successfully uploaded" });
      }

      res.json({ success: true, files: uploadedFiles });
    } catch (err) {
      console.error("Pinata upload error:", err.message);
      res.status(500).json({
        success: false,
        error: err.message || "Upload failed",
      });
    }
  }
);
// Simple local storage fallback (add this to your backend)
const localFiles = new Map(); // In-memory storage for development

router.post(
  "/upload",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "medicalFiles", maxCount: 10 },
    { name: "prescriptions", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const uploadedFiles = [];

      for (const field of ["profilePhoto", "medicalFiles", "prescriptions"]) {
        if (req.files[field]) {
          for (const file of req.files[field]) {
            console.log(`📤 Processing ${field}: ${file.originalname}`);
            
            try {
              // Try Pinata first
              const data = new FormData();
              data.append("file", fs.createReadStream(file.path), file.originalname);

              const pinataRes = await axios.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                data,
                {
                  timeout: 15000,
                  headers: {
                    ...data.getHeaders(),
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_SECRET_API_KEY,
                  },
                }
              );

              uploadedFiles.push({
                fieldName: field,
                name: file.originalname,
                hash: pinataRes.data.IpfsHash,
                source: "pinata"
              });

            } catch (pinataErr) {
              console.warn(`⚠️ Pinata failed for ${file.originalname}, using local fallback`);
              
              // Fallback: Store file content locally
              const fileContent = fs.readFileSync(file.path);
              const localHash = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              localFiles.set(localHash, {
                name: file.originalname,
                content: fileContent,
                fieldName: field,
                timestamp: new Date().toISOString()
              });

              uploadedFiles.push({
                fieldName: field,
                name: file.originalname,
                hash: localHash,
                source: "local"
              });
            } finally {
              // Clean up temp file
              try {
                if (fs.existsSync(file.path)) {
                  fs.unlinkSync(file.path);
                }
              } catch (cleanupErr) {
                console.error("Cleanup error:", cleanupErr.message);
              }
            }
          }
        }
      }

      if (uploadedFiles.length === 0) {
        return res.status(400).json({ success: false, error: "No files uploaded" });
      }

      console.log("✅ Upload completed. Files:", uploadedFiles);
      res.json({ success: true, files: uploadedFiles });
    } catch (err) {
      console.error("Upload error:", err.message);
      res.status(500).json({
        success: false,
        error: "Upload failed: " + err.message,
      });
    }
  }
);
// Add this route to your backend (if it's missing)
router.post("/uploadJSON", async (req, res) => {
  try {
    const json = req.body;
    console.log("📥 Received JSON for IPFS upload");

    // Pin JSON to IPFS
    const pinataRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      json,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );

    console.log("✅ JSON uploaded to IPFS. Hash:", pinataRes.data.IpfsHash);
    res.json({ success: true, hash: pinataRes.data.IpfsHash });
    
  } catch (err) {
    console.error("❌ Pinata JSON upload error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data?.error || err.message || "JSON upload failed",
    });
  }
});

// Add a route to serve locally stored files
router.get("/file/:hash", (req, res) => {
  const hash = req.params.hash;
  const file = localFiles.get(hash);
  
  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }

  // Set appropriate headers based on file type
  if (file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
    res.setHeader('Content-Type', 'image/jpeg');
  } else if (file.name.match(/\.pdf$/i)) {
    res.setHeader('Content-Type', 'application/pdf');
  } else {
    res.setHeader('Content-Type', 'application/octet-stream');
  }
  
  res.send(file.content);
});


export default router;
