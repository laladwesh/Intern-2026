import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, getToken, authHeaders, authHeadersFormData, clearSession } from "../utils/auth";

const campusBgStyle = {
  backgroundImage: `linear-gradient(rgba(17, 24, 39, 0.58), rgba(17, 24, 39, 0.58)), url(${process.env.PUBLIC_URL}/iitg_bg.png)`,
};

const EMPTY_STUDENT = {
  roll_number: "",
  name: "",
  email: "",
  major: "",
  minor: "",
  programme: "BTech",
  major_cpi: "",
  minor_cpi: "",
  year_of_admission: "",
  year_of_minor_admission: "",
  semester_wise_spi: {
    spi_1: "",
    spi_2: "",
    spi_3: "",
    spi_4: "",
    spi_5: "",
    spi_6: "",
    spi_7: "",
    spi_8: "",
  },
};

export default function CoordinatorPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkStatus, setBulkStatus] = useState("");

  const [newStudent, setNewStudent] = useState(EMPTY_STUDENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState("");
  const [addError, setAddError] = useState("");

  const fetchStudents = async (searchText = "") => {
    setLoadingStudents(true);
    setError("");
    try {
      const query = new URLSearchParams({ limit: "500" });
      if (searchText.trim()) query.set("search", searchText.trim());

      const res = await fetch(`${API_BASE}/admin/students?${query}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load students");
      setStudents(data.students || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");
    setIsSubmitting(true);
    try {
      const payload = {
        ...newStudent,
        roll_number: Number(newStudent.roll_number),
        major_cpi: Number(newStudent.major_cpi),
        minor_cpi: newStudent.minor_cpi ? Number(newStudent.minor_cpi) : undefined,
        year_of_admission: Number(newStudent.year_of_admission),
        year_of_minor_admission: newStudent.year_of_minor_admission
          ? Number(newStudent.year_of_minor_admission)
          : undefined,
        semester_wise_spi: Object.fromEntries(
          Object.entries(newStudent.semester_wise_spi).filter(([, value]) => value !== "")
        ),
      };

      const res = await fetch(`${API_BASE}/admin/students`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not add student");

      setAddSuccess(`Student "${payload.name}" added successfully.`);
      setNewStudent(EMPTY_STUDENT);
      fetchStudents(search);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) { setBulkStatus("Select an Excel file first."); return; }
    setBulkStatus("Uploading...");
    try {
      const formData = new FormData();
      formData.append("file", bulkFile);

      const res = await fetch(`${API_BASE}/admin/students/bulk-upload`, {
        method: "POST",
        headers: authHeadersFormData(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Bulk upload failed");

      const { success = 0, failed = 0, errors = [] } = data.results || {};
      setBulkStatus(
        `Done — ${success} added/updated, ${failed} failed.` +
          (errors.length ? ` Errors: ${errors.map((e) => `Row ${e.row}: ${e.error}`).join("; ")}` : "")
      );
      setBulkFile(null);
      fetchStudents(search);
    } catch (err) {
      setBulkStatus(err.message);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/students/bulk-upload/template`, {
        headers: authHeadersFormData(),
      });
      if (!res.ok) throw new Error("Template download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk_upload_template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setBulkStatus(err.message);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  return (
    <div className="campus-bg min-h-screen text-slate-900 p-4 md:p-8" style={campusBgStyle}>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="glass-card rounded-2xl p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Coordinator Panel</h1>
            <p className="text-slate-600 text-sm mt-1">
              Manage students, add individually, or bulk-upload via Excel.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-sm font-semibold"
          >
            Logout
          </button>
        </div>

        {/* Add Student + Bulk Upload */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Add Student */}
          <form
            onSubmit={handleAddStudent}
            className="glass-card rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-xl font-semibold">Add New Student</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Roll Number"
                value={newStudent.roll_number}
                onChange={(e) => setNewStudent((p) => ({ ...p, roll_number: e.target.value }))}
                required
              />
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Full Name"
                value={newStudent.name}
                onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
                placeholder="Institute Email"
                type="email"
                value={newStudent.email}
                onChange={(e) => setNewStudent((p) => ({ ...p, email: e.target.value }))}
                required
              />
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Major (e.g. CSE)"
                value={newStudent.major}
                onChange={(e) => setNewStudent((p) => ({ ...p, major: e.target.value }))}
                required
              />
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Minor (optional)"
                value={newStudent.minor}
                onChange={(e) => setNewStudent((p) => ({ ...p, minor: e.target.value }))}
              />
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newStudent.programme}
                onChange={(e) => setNewStudent((p) => ({ ...p, programme: e.target.value }))}
                required
              >
                {["BTech","BDes","MTech","MDes","MSc","MA","PhD","Dual"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Major CPI (e.g. 8.5)"
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={newStudent.major_cpi}
                onChange={(e) => setNewStudent((p) => ({ ...p, major_cpi: e.target.value }))}
                required
              />
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Minor CPI (optional)"
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={newStudent.minor_cpi}
                onChange={(e) => setNewStudent((p) => ({ ...p, minor_cpi: e.target.value }))}
              />
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Year of Admission (e.g. 2022)"
                type="number"
                value={newStudent.year_of_admission}
                onChange={(e) => setNewStudent((p) => ({ ...p, year_of_admission: e.target.value }))}
                required
              />
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Year of Minor Admission (optional)"
                type="number"
                value={newStudent.year_of_minor_admission}
                onChange={(e) => setNewStudent((p) => ({ ...p, year_of_minor_admission: e.target.value }))}
              />

              {["spi_1", "spi_2", "spi_3", "spi_4", "spi_5", "spi_6", "spi_7", "spi_8"].map((spiKey) => (
                <input
                  key={spiKey}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder={`${spiKey.toUpperCase()} (optional)`}
                  value={newStudent.semester_wise_spi[spiKey]}
                  onChange={(e) =>
                    setNewStudent((p) => ({
                      ...p,
                      semester_wise_spi: {
                        ...p.semester_wise_spi,
                        [spiKey]: e.target.value,
                      },
                    }))
                  }
                />
              ))}
            </div>
            {addError && <p className="text-sm text-red-400">{addError}</p>}
            {addSuccess && <p className="text-sm text-emerald-400">{addSuccess}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-[var(--brand)] px-5 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {isSubmitting ? "Adding..." : "Add Student"}
            </button>
          </form>

          {/* Bulk Upload */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Bulk Upload via Excel</h2>
            <p className="text-sm text-slate-600">
              Upload <code>.xlsx</code> / <code>.xls</code> to insert or update students in bulk.
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => { setBulkFile(e.target.files?.[0] || null); setBulkStatus(""); }}
              className="block w-full text-sm text-slate-700
                file:mr-4 file:rounded file:border-0
                file:bg-slate-200 file:px-3 file:py-2 file:text-slate-900
                file:cursor-pointer cursor-pointer"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleBulkUpload}
                className="rounded-md bg-[var(--brand)] px-5 py-2 text-sm font-semibold"
              >
                Upload Students
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                className="rounded-md bg-slate-300 hover:bg-slate-200 px-5 py-2 text-sm font-semibold"
              >
                Download Template
              </button>
            </div>
            {bulkStatus && (
              <p className={`text-sm ${bulkStatus.includes("failed") || bulkStatus.includes("Error") ? "text-red-400" : "text-emerald-400"}`}>
                {bulkStatus}
              </p>
            )}
          </div>
        </div>

        {/* Student Table */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">
              All Students{" "}
              <span className="text-slate-500 text-base font-normal">({students.length})</span>
            </h2>
            <form
              onSubmit={(e) => { e.preventDefault(); fetchStudents(search); }}
              className="flex gap-2"
            >
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm min-w-[200px]"
                placeholder="Search name / email / roll"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type="submit"
                className="rounded-md bg-slate-300 hover:bg-slate-200 px-4 py-2 text-sm font-semibold"
              >
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); fetchStudents(""); }}
                  className="rounded-md bg-slate-200 px-3 py-2 text-sm"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

          <div className="overflow-auto rounded-lg bg-white/70">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-200">
                <tr className="text-slate-800">
                  <th className="py-3 px-4 text-left font-semibold">#</th>
                  <th className="py-3 px-4 text-left font-semibold">Roll</th>
                  <th className="py-3 px-4 text-left font-semibold">Name</th>
                  <th className="py-3 px-4 text-left font-semibold">Email</th>
                  <th className="py-3 px-4 text-left font-semibold">Major</th>
                  <th className="py-3 px-4 text-left font-semibold">Programme</th>
                  <th className="py-3 px-4 text-left font-semibold">CPI</th>
                  <th className="py-3 px-4 text-left font-semibold">Status</th>
                  <th className="py-3 px-4 text-left font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td className="py-6 px-4 text-slate-600" colSpan="9">
                      Loading students...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td className="py-6 px-4 text-slate-600" colSpan="9">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  students.map((s, idx) => (
                    <tr
                      key={s._id}
                      className="border-t border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <td className="py-2 px-4 text-slate-600">{idx + 1}</td>
                      <td className="py-2 px-4">{s.roll_number || "-"}</td>
                      <td className="py-2 px-4">{s.name || "-"}</td>
                      <td className="py-2 px-4 text-slate-700">{s.email}</td>
                      <td className="py-2 px-4">{s.major || "-"}</td>
                      <td className="py-2 px-4">{s.programme || "-"}</td>
                      <td className="py-2 px-4">{s.major_cpi ?? "-"}</td>
                      <td className="py-2 px-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.status === "Placed_Student"
                              ? "bg-emerald-900 text-emerald-300"
                              : s.status === "Blocked"
                              ? "bg-red-900 text-red-300"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {s.status || "-"}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        {s.is_registered ? (
                          <span className="text-emerald-400">Yes</span>
                        ) : (
                          <span className="text-slate-500">No</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
