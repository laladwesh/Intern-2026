import { useEffect, useMemo, useState } from "react";
import { API_BASE, authHeaders, authHeadersFormData, clearSession } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

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
    spi_9: "",
    spi_10: "",
    spi_11: "",
    spi_12: "",
  },
};

const EMPTY_DEADLINE = {
  title: "CCD Profile Submission Deadline",
  description: "Students can edit only before this deadline",
  deadline_date: "",
};

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}

function toDateTimeLocalValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getCvUrl(fileNameOrUrl) {
  if (!fileNameOrUrl) return null;
  if (/^https?:\/\//i.test(fileNameOrUrl)) return fileNameOrUrl;
  return `${API_BASE}/cv/${encodeURIComponent(fileNameOrUrl)}`;
}

function ModalShell({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-4xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="border px-3 py-1 text-sm hover:bg-slate-50">Close</button>
        </div>
        <div className="max-h-[75vh] overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export default function CoordinatorPage() {
  const navigate = useNavigate();

  const [activeMenu, setActiveMenu] = useState("home");
  const [search, setSearch] = useState("");

  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [deadlineForm, setDeadlineForm] = useState(EMPTY_DEADLINE);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState("manual");
  const [newStudent, setNewStudent] = useState(EMPTY_STUDENT);
  const [bulkFile, setBulkFile] = useState(null);

  const [saving, setSaving] = useState(false);

  const visibleStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter((s) =>
      [s.name, s.email, String(s.roll_number), s.programme, s.major]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [students, search]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load stats");
      setStats(data);
    } catch (err) {
      toast.error(err.message || "Failed to load stats");
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`${API_BASE}/admin/students?limit=1000`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load students");
      setStudents(data.students || []);
    } catch (err) {
      toast.error(err.message || "Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchAdminProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/auth/me`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load admin profile");
      setAdminEmail(data.email || "");
    } catch {
      setAdminEmail("");
    }
  };

  useEffect(() => {
    fetchStats();
    fetchStudents();
    fetchAdminProfile();
  }, []);

  useEffect(() => {
    const activeDeadline = stats?.activeDeadline;
    if (!activeDeadline) {
      setDeadlineForm((prev) => ({ ...prev, deadline_date: "" }));
      return;
    }

    setDeadlineForm({
      title: activeDeadline.title || "CCD Profile Submission Deadline",
      description: activeDeadline.description || "Students can edit only before this deadline",
      deadline_date: toDateTimeLocalValue(activeDeadline.deadline_date),
    });
  }, [stats?.activeDeadline]);

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  const handleSetDeadline = async (e) => {
    e.preventDefault();
    try {
      if (!deadlineForm.deadline_date) {
        toast.error("Please select a deadline date and time");
        return;
      }

      const parsed = new Date(deadlineForm.deadline_date);
      if (Number.isNaN(parsed.getTime())) {
        toast.error("Invalid deadline date format");
        return;
      }

      const res = await fetch(`${API_BASE}/admin/deadlines`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...deadlineForm,
          deadline_date: parsed.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to set deadline");
      toast.success("Deadline set successfully");
      fetchStats();
    } catch (err) {
      toast.error(err.message || "Failed to set deadline");
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...newStudent,
        roll_number: Number(newStudent.roll_number),
        major_cpi: Number(newStudent.major_cpi),
        minor_cpi: newStudent.minor_cpi ? Number(newStudent.minor_cpi) : undefined,
        minor: newStudent.minor || undefined,
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

      toast.success("Student added successfully");
      setNewStudent(EMPTY_STUDENT);
      setShowAddModal(false);
      fetchStudents();
      fetchStats();
    } catch (err) {
      toast.error(err.message || "Could not add student");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("Select an Excel file first");
      return;
    }

    setSaving(true);
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

      toast.success(`Bulk upload done. Success: ${data.results?.success || 0}`);
      setBulkFile(null);
      setShowAddModal(false);
      fetchStudents();
      fetchStats();
    } catch (err) {
      toast.error(err.message || "Bulk upload failed");
    } finally {
      setSaving(false);
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
      toast.error(err.message || "Template download failed");
    }
  };

  const openStudentDetails = (id) => {
    const detailPath = `${process.env.PUBLIC_URL || ""}/coordinator/students/${id}`;
    window.open(detailPath, "_blank", "noopener,noreferrer");
  };

  const toggleCvVerification = async (s) => {
    try {
      const res = await fetch(`${API_BASE}/admin/students/${s._id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ cv_verified: !s.cv_verified }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      toast.success(`CV marked as ${data.student.cv_verified ? "Verified" : "De-Verified"}`);
      fetchStudents();
    } catch (err) {
      toast.error(err.message || "Update failed");
    }
  };

  const renderHome = () => {
    const activeDeadline = stats?.activeDeadline;

    return (
      <div className="space-y-5">
        <div className="bg-white p-4">
          <h2 className="text-2xl font-bold text-slate-800">Announcements</h2>
          <div className="mt-4 border-t pt-4 text-slate-600">There is no announcement available.</div>
        </div>

        <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
          <div className="bg-white p-4">
            <p className="text-base font-semibold text-slate-700">Jobs Approved</p>
            <p className="mt-4 text-3xl font-bold text-green-700">0/0</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-base font-semibold text-slate-700">Download</p>
            <div className="mt-4 space-y-2 text-sm">
              <button className="w-full bg-slate-100 p-2 text-left">All Students' Data</button>
              <button className="w-full bg-slate-100 p-2 text-left">All Companies' Data</button>
              <button className="w-full bg-slate-100 p-2 text-left">All Jobs Data</button>
            </div>
          </div>
          <div className="bg-white p-4">
            <p className="text-base font-semibold text-slate-700">Registered Students</p>
            <p className="mt-4 text-4xl font-bold text-green-700">{stats?.totalStudents ?? 0}</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-base font-semibold text-slate-700">Registered Companies</p>
            <p className="mt-4 text-4xl font-bold text-green-700">0</p>
          </div>
        </div>

        <div className="bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-800">Submission Deadline</h3>
          <div className="mt-2 text-sm text-slate-700">
            {activeDeadline ? (
              <p>
                Currently set: <span className="font-semibold">{formatDate(activeDeadline.deadline_date)}</span>
              </p>
            ) : (
              <p>No deadline is currently set.</p>
            )}
          </div>
          <form onSubmit={handleSetDeadline} className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              className="border border-slate-300 px-3 py-2"
              value={deadlineForm.title}
              onChange={(e) => setDeadlineForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Title"
              required
            />
            <input
              className="border border-slate-300 px-3 py-2"
              value={deadlineForm.description}
              onChange={(e) => setDeadlineForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description"
            />
            <input
              className="border border-slate-300 px-3 py-2"
              type="datetime-local"
              value={deadlineForm.deadline_date}
              onChange={(e) => setDeadlineForm((p) => ({ ...p, deadline_date: e.target.value }))}
              required
            />
            <div className="md:col-span-3 flex justify-end">
              <button className="bg-blue-600 px-4 py-2 font-semibold text-white">
                {activeDeadline ? "Update Deadline" : "Set Deadline"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderStudents = () => {
    return (
      <div className="bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Students</h2>
          <div className="flex gap-2">
            <input
              className="border border-slate-300 px-3 py-2"
              placeholder="Search students"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 px-4 py-2 font-semibold text-white"
            >
              New Student
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 text-sm text-slate-800">
                <th className="p-3">ID</th>
                <th className="p-3">Name of Student</th>
                <th className="p-3">IITG Webmail</th>
                <th className="p-3">Roll Number</th>
                <th className="p-3">Programme</th>
                <th className="p-3">Discipline</th>
                <th className="p-3">CV</th>
                <th className="p-3">View Details</th>
                <th className="p-3">Drive Link</th>
                <th className="p-3">Verification</th>
              </tr>
            </thead>
            <tbody>
              {loadingStudents ? (
                <tr><td className="p-3" colSpan="10">Loading...</td></tr>
              ) : visibleStudents.length === 0 ? (
                <tr><td className="p-3" colSpan="10">No students found.</td></tr>
              ) : (
                visibleStudents.map((s, idx) => {
                  const cvList = [s?.cv?.tech, s?.cv?.non_tech, s?.cv?.core].filter(Boolean);
                  return (
                    <tr key={s._id} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                      <td className="p-3">{idx + 1}</td>
                      <td className="p-3">{s.name || "-"}</td>
                      <td className="p-3">{s.email}</td>
                      <td className="p-3">{s.roll_number || "-"}</td>
                      <td className="p-3">{s.programme || "-"}</td>
                      <td className="p-3">{s.major || "-"}</td>
                      <td className="p-3">
                        {cvList.length ? (
                          <div className="flex flex-wrap gap-2">
                            {cvList.map((cvName, i) => (
                              <a
                                key={i}
                                href={getCvUrl(cvName) || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="border border-blue-600 px-2 py-1 text-blue-700"
                              >
                                CV {i + 1}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span>No CV</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openStudentDetails(s._id)}
                          className="text-blue-600 underline"
                        >
                          Details
                        </button>
                      </td>
                      <td className="p-3">
                        {s?.cv?.drive_Link ? (
                          <a href={s.cv.drive_Link} target="_blank" rel="noreferrer" className="text-blue-600 underline">Link</a>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => toggleCvVerification(s)}
                          className="bg-blue-600 px-4 py-1.5 font-semibold text-white"
                        >
                          {s.cv_verified ? "De-Verify" : "Verify"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="flex min-h-screen">
        <aside className="w-80 border-r bg-white">
          <div className="flex items-center gap-3 border-b px-4 py-5">
            <img src={`${process.env.PUBLIC_URL}/iitg.png`} alt="IITG" className="h-14 w-14" />
            <h1 className="whitespace-nowrap text-2xl font-semibold text-slate-900">Internship Portal</h1>
          </div>

          <nav className="px-3 py-4 text-base text-slate-900">
            {["Home", "Students"].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => item === "Home" ? setActiveMenu("home") : item === "Students" ? setActiveMenu("students") : null}
                className={`mb-1 block w-full px-3 py-2 text-left ${
                  (activeMenu === "home" && item === "Home") || (activeMenu === "students" && item === "Students")
                    ? "bg-slate-200 font-semibold"
                    : "hover:bg-slate-100"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="absolute bottom-4 px-4 text-sm text-slate-700">Technical Support Team, CCD, IITG</div>
        </aside>

        <main className="flex-1">
          <header className="flex items-center justify-end border-b bg-white px-5 py-3">
            <div className="mr-3 text-base text-blue-700">{adminEmail || "Admin"}</div>
            <button onClick={handleLogout} className="bg-slate-200 px-3 py-1 text-sm hover:bg-slate-300">Logout</button>
          </header>

          <div className="p-4">{activeMenu === "home" ? renderHome() : renderStudents()}</div>
        </main>
      </div>

      <ModalShell open={showAddModal} title="Add Student" onClose={() => setShowAddModal(false)}>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setAddMode("manual")}
            className={`px-4 py-2 ${addMode === "manual" ? "bg-blue-600 text-white" : "bg-slate-100"}`}
          >
            Manual Single Upload
          </button>
          <button
            type="button"
            onClick={() => setAddMode("bulk")}
            className={`px-4 py-2 ${addMode === "bulk" ? "bg-blue-600 text-white" : "bg-slate-100"}`}
          >
            Bulk Upload
          </button>
        </div>

        {addMode === "manual" ? (
          <form onSubmit={handleAddStudent} className="grid gap-3 sm:grid-cols-2">
            <input className="border border-slate-300 px-3 py-2" placeholder="Roll Number" value={newStudent.roll_number} onChange={(e) => setNewStudent((p) => ({ ...p, roll_number: e.target.value }))} required />
            <input className="border border-slate-300 px-3 py-2" placeholder="Name" value={newStudent.name} onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))} required />
            <input className="border border-slate-300 px-3 py-2 sm:col-span-2" placeholder="Email" value={newStudent.email} onChange={(e) => setNewStudent((p) => ({ ...p, email: e.target.value }))} required />
            <input className="border border-slate-300 px-3 py-2" placeholder="Major" value={newStudent.major} onChange={(e) => setNewStudent((p) => ({ ...p, major: e.target.value }))} required />
            <input className="border border-slate-300 px-3 py-2" placeholder="Minor (optional)" value={newStudent.minor} onChange={(e) => setNewStudent((p) => ({ ...p, minor: e.target.value }))} />
            <select className="border border-slate-300 px-3 py-2" value={newStudent.programme} onChange={(e) => setNewStudent((p) => ({ ...p, programme: e.target.value }))}>
              {["BTech", "BDes", "MTech", "MDes", "MSc", "MA", "PhD", "Dual"].map((p) => <option key={p}>{p}</option>)}
            </select>
            <input className="border border-slate-300 px-3 py-2" placeholder="Major CPI" value={newStudent.major_cpi} onChange={(e) => setNewStudent((p) => ({ ...p, major_cpi: e.target.value }))} required />
            <input className="border border-slate-300 px-3 py-2" placeholder="Minor CPI (optional)" value={newStudent.minor_cpi} onChange={(e) => setNewStudent((p) => ({ ...p, minor_cpi: e.target.value }))} />
            <input className="border border-slate-300 px-3 py-2" placeholder="Year of Admission" value={newStudent.year_of_admission} onChange={(e) => setNewStudent((p) => ({ ...p, year_of_admission: e.target.value }))} required />
            <input className="border border-slate-300 px-3 py-2" placeholder="Year of Minor Admission (optional)" value={newStudent.year_of_minor_admission} onChange={(e) => setNewStudent((p) => ({ ...p, year_of_minor_admission: e.target.value }))} />

            <div className="sm:col-span-2 border-t pt-2">
              <p className="mb-2 text-sm font-semibold text-slate-700">Semester-wise SPI/CPI</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {Object.keys(newStudent.semester_wise_spi).map((key) => (
                  <input
                    key={key}
                    className="border border-slate-300 px-3 py-2"
                    placeholder={key.toUpperCase().replace("_", " ")}
                    value={newStudent.semester_wise_spi[key]}
                    onChange={(e) =>
                      setNewStudent((prev) => ({
                        ...prev,
                        semester_wise_spi: {
                          ...prev.semester_wise_spi,
                          [key]: e.target.value,
                        },
                      }))
                    }
                  />
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 mt-2 flex justify-end">
              <button type="submit" disabled={saving} className="bg-blue-600 px-4 py-2 font-semibold text-white">
                {saving ? "Saving..." : "Add Student"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
              className="block w-full border border-slate-300 p-2"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={downloadTemplate} className="bg-slate-200 px-4 py-2 font-semibold">Download Template</button>
              <button type="button" onClick={handleBulkUpload} disabled={saving} className="bg-blue-600 px-4 py-2 font-semibold text-white">
                {saving ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        )}
      </ModalShell>

    </div>
  );
}
