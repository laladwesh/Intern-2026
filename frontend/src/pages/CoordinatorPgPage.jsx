import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { API_BASE, authHeaders, authHeadersFormData, clearSession } from "../utils/auth";
import { getProgrammeDisplay } from "../utils/pgProgrammes";

function toDateTimeLocalValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function StatusBadge({ uploaded }) {
  return uploaded ? (
    <span className="inline-block rounded-sm bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Uploaded</span>
  ) : (
    <span className="inline-block rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Pending</span>
  );
}

export default function CoordinatorPgPage() {
  const navigate = useNavigate();
  const csvInputRef = useRef(null);

  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, withPhoto: 0, pending: 0 });
  const [deadline, setDeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [deadlineForm, setDeadlineForm] = useState({
    title: "PG Photo Submission Deadline",
    description: "PG students must upload their profile photo before this deadline",
    deadline_date: "",
  });

  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [deadlineSaving, setDeadlineSaving] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [studentsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/pg/students`, { headers: authHeaders() }),
        fetch(`${API_BASE}/admin/pg/stats`, { headers: authHeaders() }),
      ]);

      if (studentsRes.status === 401 || studentsRes.status === 403) {
        clearSession();
        navigate("/", { replace: true });
        return;
      }

      const studentsData = await studentsRes.json();
      const statsData = await statsRes.json();

      setStudents(studentsData.students || []);
      setStats({
        total: statsData.total || 0,
        withPhoto: statsData.withPhoto || 0,
        pending: statsData.pending || 0,
      });
      setDeadline(statsData.deadline || null);

      if (statsData.deadline) {
        setDeadlineForm((prev) => ({
          ...prev,
          title: statsData.deadline.title || prev.title,
          description: statsData.deadline.description || prev.description,
          deadline_date: toDateTimeLocalValue(statsData.deadline.deadline_date),
        }));
      } else {
        setDeadlineForm((prev) => ({ ...prev, deadline_date: "" }));
      }
    } catch {
      toast.error("Failed to load PG student data");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error("Select a CSV or Excel file first");
      return;
    }
    setCsvUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch(`${API_BASE}/admin/pg/upload-csv`, {
        method: "POST",
        headers: authHeadersFormData(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      toast.success(data.message || "CSV uploaded");
      if (data.results?.errors?.length) {
        toast.error(`${data.results.errors.length} row(s) had errors`, { duration: 5000 });
      }
      setCsvFile(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
      fetchAll();
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setCsvUploading(false);
    }
  };

  const handleSetDeadline = async (e) => {
    e.preventDefault();
    if (!deadlineForm.deadline_date) {
      toast.error("Select a deadline date and time");
      return;
    }
    setDeadlineSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/pg/deadline`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...deadlineForm,
          deadline_date: new Date(deadlineForm.deadline_date).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to set deadline");
      toast.success("PG deadline saved");
      fetchAll();
    } catch (err) {
      toast.error(err.message || "Failed to set deadline");
    } finally {
      setDeadlineSaving(false);
    }
  };

  const handleClearDeadline = async () => {
    if (!window.confirm("Clear the current PG photo deadline?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/pg/deadline`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Deadline cleared");
      fetchAll();
    } catch (err) {
      toast.error(err.message || "Failed to clear deadline");
    }
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const res = await fetch(`${API_BASE}/admin/pg/download-photos`, { headers: authHeaders() });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Download failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pg-photos-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Download failed");
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Delete this PG student record? This will also remove their uploaded photo.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/admin/pg/students/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("PG student deleted");
      fetchAll();
    } catch (err) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [s.email, s.name, s.roll_number, s.mobile, s.hostel, getProgrammeDisplay(s.programme)]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q));
  });

  const getPhotoUrl = (filename) => `${API_BASE}/pg-image/${encodeURIComponent(filename)}`;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-sm bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Total PG Students</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-sm bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Photo Uploaded</p>
          <p className="mt-2 text-3xl font-bold text-green-700">{stats.withPhoto}</p>
        </div>
        <div className="rounded-sm bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Pending Upload</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{stats.pending}</p>
        </div>
      </div>

      {/* Deadline Management */}
      <div className="rounded-sm bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Photo Upload Deadline</h2>
        <p className="mb-4 text-sm text-slate-500">
          Set a deadline after which PG students cannot upload or edit their photos.
        </p>
        {deadline && (
          <div className="mb-3 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <strong>Active deadline:</strong> {new Date(deadline.deadline_date).toLocaleString()}
            {new Date() > new Date(deadline.deadline_date) && (
              <span className="ml-2 font-bold text-red-700">(EXPIRED)</span>
            )}
          </div>
        )}
        <form onSubmit={handleSetDeadline} className="grid gap-3 sm:grid-cols-3">
          <input
            className="border border-slate-300 px-3 py-2 text-sm"
            value={deadlineForm.title}
            onChange={(e) => setDeadlineForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Deadline title"
            required
          />
          <input
            className="border border-slate-300 px-3 py-2 text-sm"
            value={deadlineForm.description}
            onChange={(e) => setDeadlineForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)"
          />
          <input
            type="datetime-local"
            className="border border-slate-300 px-3 py-2 text-sm"
            value={deadlineForm.deadline_date}
            onChange={(e) => setDeadlineForm((p) => ({ ...p, deadline_date: e.target.value }))}
            required
          />
          <div className="sm:col-span-3 flex justify-end gap-2">
            {deadline && (
              <button
                type="button"
                onClick={handleClearDeadline}
                className="border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Clear Deadline
              </button>
            )}
            <button
              type="submit"
              disabled={deadlineSaving}
              className="bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {deadlineSaving ? "Saving..." : deadline ? "Update Deadline" : "Set Deadline"}
            </button>
          </div>
        </form>
      </div>

      {/* CSV Upload */}
      <div className="rounded-sm bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Import PG Students via CSV / Excel</h2>
        <p className="mb-3 text-sm text-slate-500">
          Upload a CSV or Excel file with an <strong>email</strong> column. Each unique email will be added as a PG student who can log in and submit their photo.
          Duplicate emails are skipped.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="block border border-slate-300 p-2 text-sm"
          />
          <button
            type="button"
            onClick={handleCsvUpload}
            disabled={!csvFile || csvUploading}
            className="bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {csvUploading ? "Uploading..." : "Upload CSV"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">Required column: <code>email</code>. Additional columns are ignored.</p>
      </div>

      {/* Student List */}
      <div className="rounded-sm bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">
            PG Students <span className="ml-1 text-sm font-normal text-slate-500">({filteredStudents.length} shown)</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="border border-slate-300 px-3 py-1.5 text-sm"
              placeholder="Search by name / email / roll no."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip || stats.withPhoto === 0}
              className="bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {downloadingZip ? "Preparing ZIP..." : `Download All Photos (${stats.withPhoto})`}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : filteredStudents.length === 0 ? (
          <p className="text-slate-500">No PG students found. Upload a CSV to get started.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="p-3">#</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Roll No.</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Hostel</th>
                  <th className="p-3">Programme</th>
                  <th className="p-3">Photo</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => (
                  <tr key={s._id} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                    <td className="p-3 text-slate-500">{idx + 1}</td>
                    <td className="p-3">{s.email}</td>
                    <td className="p-3">{s.name || <span className="text-slate-400">—</span>}</td>
                    <td className="p-3">{s.roll_number || <span className="text-slate-400">—</span>}</td>
                    <td className="p-3">{s.mobile || <span className="text-slate-400">—</span>}</td>
                    <td className="p-3">{s.hostel || <span className="text-slate-400">—</span>}</td>
                    <td className="p-3 max-w-[200px]">
                      <span className="block truncate text-xs" title={getProgrammeDisplay(s.programme)}>
                        {getProgrammeDisplay(s.programme)}
                      </span>
                    </td>
                    <td className="p-3">
                      {s.profile_photo ? (
                        <a href={getPhotoUrl(s.profile_photo)} target="_blank" rel="noreferrer">
                          <img
                            src={getPhotoUrl(s.profile_photo)}
                            alt={s.name || s.email}
                            className="h-10 w-[50px] object-cover border border-slate-300"
                          />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">No photo</span>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge uploaded={!!s.profile_photo} />
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(s._id)}
                        disabled={deletingId === s._id}
                        className="text-xs text-red-600 underline hover:text-red-800 disabled:opacity-50"
                      >
                        {deletingId === s._id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
