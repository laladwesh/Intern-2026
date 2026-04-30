import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import imageCompression from "browser-image-compression";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import toast from "react-hot-toast";
import "../styles/ShareForCare.css";

const API_URL = process.env.REACT_APP_API_URL || "/intern-2026/api";

export default function ShareForCarePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [filterPermanent, setFilterPermanent] = useState("all");

  // Excel Creator State
  const [excelData, setExcelData] = useState([
    ["", "", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
  ]);

  // Check authentication on mount
  useEffect(() => {
    const storedAuth = sessionStorage.getItem("shareAuth");
    if (storedAuth) {
      const auth = JSON.parse(storedAuth);
      checkAuth(auth.username, auth.password);
    }
  }, []);

  // Fetch files when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
    }
  }, [isAuthenticated, searchQuery, filterPermanent]);

  const checkAuth = async (user, pass) => {
    try {
      const credentials = btoa(`${user}:${pass}`);
      const response = await fetch(`${API_URL}/share/auth/check`, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem("shareAuth", JSON.stringify({ username: user, password: pass }));
      } else {
        setIsAuthenticated(false);
        sessionStorage.removeItem("shareAuth");
        toast.error("Invalid credentials");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Authentication failed");
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    checkAuth(username, password);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("shareAuth");
    setUsername("");
    setPassword("");
    toast.success("Logged out");
  };

  const getAuthHeaders = () => {
    const auth = JSON.parse(sessionStorage.getItem("shareAuth"));
    return {
      Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
    };
  };

  const fetchFiles = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filterPermanent !== "all") params.append("permanent", filterPermanent === "permanent");

      const response = await fetch(`${API_URL}/share/files?${params}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const handleFileUpload = async (e, isPermanent = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("isPermanent", isPermanent);

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/share/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (response.ok) {
        toast.success(`File uploaded ${isPermanent ? "permanently" : "for 15 minutes"}`);
        fetchFiles();
        e.target.value = "";
      } else {
        toast.error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await fetch(`${API_URL}/share/download/${fileId}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const blob = await response.blob();
        saveAs(blob, fileName);
        toast.success("Downloaded successfully");
        fetchFiles();
      } else {
        toast.error("Download failed");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed");
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      const response = await fetch(`${API_URL}/share/files/${fileId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success("File deleted");
        fetchFiles();
      } else {
        toast.error("Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Delete failed");
    }
  };

  const handleCopyLink = (shareUrl) => {
    const fullUrl = `https://iitg.ac.in/intern-2026/${shareUrl}`;
    navigator.clipboard.writeText(fullUrl).then(
      () => {
        toast.success("Link copied to clipboard!");
      },
      (err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy link");
      }
    );
  };

  // Image Compression
  const handleImageCompression = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      const formData = new FormData();
      formData.append("image", compressedFile);
      formData.append("quality", "80");

      const response = await fetch(`${API_URL}/share/tools/compress-image`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Compressed! Reduction: ${result.reduction}`);
        fetchFiles();
        e.target.value = "";
      } else {
        toast.error("Compression failed");
      }
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Compression failed");
    } finally {
      setLoading(false);
    }
  };

  // PDF Merger
  const handlePDFMerge = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length < 2) {
      toast.error("Select at least 2 PDF files");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("pdfs", file));

      const response = await fetch(`${API_URL}/share/tools/merge-pdfs`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (response.ok) {
        toast.success("PDFs merged successfully!");
        fetchFiles();
        e.target.value = "";
      } else {
        toast.error("Merge failed");
      }
    } catch (error) {
      console.error("Merge error:", error);
      toast.error("Merge failed");
    } finally {
      setLoading(false);
    }
  };

  // File Compression (ZIP)
  const handleFileCompression = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch(`${API_URL}/share/tools/compress-files`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (response.ok) {
        toast.success("Files compressed into ZIP!");
        fetchFiles();
        e.target.value = "";
      } else {
        toast.error("Compression failed");
      }
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Compression failed");
    } finally {
      setLoading(false);
    }
  };

  // CV Downloader
  const handleCVDownloader = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      e.target.value = "";
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("excel", file);

      const response = await fetch(`${API_URL}/share/tools/cv-downloader`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          `CVs downloaded! Success: ${result.successCount}, Failed: ${result.failedCount}`
        );
        if (result.failedCount > 0) {
          console.log("Failed URLs:", result.failed);
        }
        fetchFiles();
        e.target.value = "";
      } else {
        const error = await response.json();
        toast.error(error.message || "CV download failed");
      }
    } catch (error) {
      console.error("CV download error:", error);
      toast.error("CV download failed");
    } finally {
      setLoading(false);
    }
  };

  // Excel Creator
  const handleExcelCellChange = (rowIndex, colIndex, value) => {
    const newData = [...excelData];
    newData[rowIndex][colIndex] = value;
    setExcelData(newData);
  };

  const addExcelRow = () => {
    setExcelData([...excelData, ["", "", "", ""]]);
  };

  const addExcelColumn = () => {
    setExcelData(excelData.map((row) => [...row, ""]));
  };

  const createExcelFile = async () => {
    try {
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Upload to server
      const formData = new FormData();
      formData.append("file", blob, "created-excel.xlsx");
      formData.append("isPermanent", "false");

      const response = await fetch(`${API_URL}/share/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (response.ok) {
        toast.success("Excel created and uploaded!");
        fetchFiles();
        setExcelData([["", "", "", ""], ["", "", "", ""], ["", "", "", ""]]);
      } else {
        toast.error("Failed to upload Excel");
      }
    } catch (error) {
      console.error("Excel creation error:", error);
      toast.error("Failed to create Excel");
    }
  };

  const downloadExcelDirectly = () => {
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "created-excel.xlsx");
    toast.success("Excel downloaded!");
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.trim().split("\n").map((row) => row.split("\t"));
      
      // Ensure we have at least the data we're pasting
      const maxCols = Math.max(...rows.map(row => row.length));
      const normalizedRows = rows.map(row => {
        const newRow = [...row];
        while (newRow.length < maxCols) {
          newRow.push("");
        }
        return newRow;
      });
      
      setExcelData(normalizedRows);
      toast.success("Pasted from clipboard!");
    } catch (error) {
      console.error("Paste error:", error);
      toast.error("Failed to paste");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;

    if (diff <= 0) return "Expired";

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  };

  if (!isAuthenticated) {
    return (
      <div className="share-login-container">
        <div className="share-login-box">
          <h1>Share for Care</h1>
          <p>CCD Office File Sharing Platform</p>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="share-container">
      <header className="share-header">
        <h1>Share for Care - CCD Office</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <div className="share-tabs">
        <button
          className={activeTab === "upload" ? "active" : ""}
          onClick={() => setActiveTab("upload")}
        >
          Upload & Tools
        </button>
        <button
          className={activeTab === "excel" ? "active" : ""}
          onClick={() => setActiveTab("excel")}
        >
          Excel Creator
        </button>
        <button
          className={activeTab === "files" ? "active" : ""}
          onClick={() => setActiveTab("files")}
        >
          All Files
        </button>
      </div>

      <div className="share-content">
        {activeTab === "upload" && (
          <div className="upload-tools-section">
            <div className="section-group">
              <h2>Upload Files</h2>
              <div className="upload-options">
                <div className="upload-box">
                  <h3>Temporary (15 minutes)</h3>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, false)}
                    disabled={loading}
                  />
                  <p>File will be automatically deleted after 15 minutes</p>
                </div>
                <div className="upload-box">
                  <h3>Permanent</h3>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, true)}
                    disabled={loading}
                  />
                  <p>File will remain until manually deleted</p>
                </div>
              </div>
            </div>

            <div className="section-group">
              <h2>File Processing Tools</h2>
              <div className="tools-grid">
                <div className="tool-box">
                  <h3>Image Compressor</h3>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageCompression}
                    disabled={loading}
                  />
                  <p>Compress images to reduce size</p>
                </div>

                <div className="tool-box">
                  <h3>PDF Merger</h3>
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handlePDFMerge}
                    disabled={loading}
                  />
                  <p>Select multiple PDFs to merge</p>
                </div>

                <div className="tool-box">
                  <h3>File Compressor (ZIP)</h3>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileCompression}
                    disabled={loading}
                  />
                  <p>Compress multiple files into ZIP</p>
                </div>

                <div className="tool-box">
                  <h3>CV Downloader</h3>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleCVDownloader}
                    disabled={loading}
                  />
                  <p>Upload Excel with CV URLs to download all CVs as ZIP</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "excel" && (
          <div className="excel-section">
            <h2>Excel Creator & Editor</h2>
            <div className="excel-controls">
              <button onClick={addExcelRow}>Add Row</button>
              <button onClick={addExcelColumn}>Add Column</button>
              <button onClick={pasteFromClipboard}>Paste from Clipboard</button>
              <button onClick={createExcelFile}>Create & Upload</button>
              <button onClick={downloadExcelDirectly}>Download Directly</button>
            </div>
            <div className="excel-grid">
              <table>
                <tbody>
                  {excelData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, colIndex) => (
                        <td key={colIndex}>
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) =>
                              handleExcelCellChange(rowIndex, colIndex, e.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="files-section">
            <div className="files-controls">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <select
                value={filterPermanent}
                onChange={(e) => setFilterPermanent(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Files</option>
                <option value="temporary">Temporary Only</option>
                <option value="permanent">Permanent Only</option>
              </select>
              <button onClick={fetchFiles}>Refresh</button>
            </div>

            <div className="files-list">
              {files.length === 0 ? (
                <p className="no-files">No files found</p>
              ) : (
                files.map((file) => (
                  <div key={file._id} className="file-item">
                    <div className="file-info">
                      <div className="file-name">
                        {file.originalName}
                      </div>
                      <div className="file-meta">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>•</span>
                        <span>Downloads: {file.downloadCount}</span>
                        {!file.isPermanent && (
                          <>
                            <span>•</span>
                            <span className="expires">Expires in: {formatTimeRemaining(file.expiresAt)}</span>
                          </>
                        )}
                        {file.isPermanent && (
                          <>
                            <span>•</span>
                            <span className="permanent">Permanent</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        onClick={() => handleCopyLink(file.shareUrl)}
                        className="copy-btn"
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={() => handleDownload(file._id, file.originalName)}
                        className="download-btn"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(file._id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Processing...</div>
        </div>
      )}
    </div>
  );
}
