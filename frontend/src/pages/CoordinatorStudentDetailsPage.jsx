import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE, authHeaders, clearSession } from "../utils/auth";
import toast from "react-hot-toast";

const TAB_KEYS = ["basic", "address", "education", "documents", "declaration"];

const TAB_LABELS = {
  basic: "Basic Info",
  address: "Home Address",
  education: "Education",
  documents: "Documents",
  declaration: "Declaration",
};

function getCvUrl(fileNameOrUrl) {
  if (!fileNameOrUrl) return null;
  if (/^https?:\/\//i.test(fileNameOrUrl)) return fileNameOrUrl;
  return `${API_BASE}/cv/${encodeURIComponent(fileNameOrUrl)}`;
}

function getImageUrl(fileNameOrUrl) {
  if (!fileNameOrUrl) return null;
  if (/^https?:\/\//i.test(fileNameOrUrl)) return fileNameOrUrl;
  return `${API_BASE}/image/${encodeURIComponent(fileNameOrUrl)}`;
}

function InfoRow({ label, value }) {
  return (
    <div className="border-b border-slate-100 py-2">
      <span className="font-semibold text-slate-700">{label}: </span>
      <span className="text-slate-900">{value ?? "-"}</span>
    </div>
  );
}

export default function CoordinatorStudentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("basic");
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");

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

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/students/${id}`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load student details");
        setStudent(data);
      } catch (err) {
        toast.error(err.message || "Failed to load student details");
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
    fetchAdminProfile();
  }, [id]);

  const cvEntries = useMemo(() => {
    if (!student?.cv) return [];
    return [
      { label: "Tech CV", value: student.cv.tech },
      { label: "Non-Tech CV", value: student.cv.non_tech },
      { label: "Core CV", value: student.cv.core },
    ].filter((item) => Boolean(item.value));
  }, [student]);

  if (loading) {
    return <div className="min-h-screen bg-slate-100 p-6">Loading student details...</div>;
  }

  if (!student) {
    return <div className="min-h-screen bg-slate-100 p-6">Student not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="flex min-h-screen">
        <aside className="w-80 border-r bg-white">
          <div className="flex items-center gap-3 border-b px-4 py-5">
            <img src={`${process.env.PUBLIC_URL}/iitg.png`} alt="IITG" className="h-14 w-14" />
            <h1 className="whitespace-nowrap text-2xl font-semibold text-slate-900">Internship Portal</h1>
          </div>

          <nav className="px-3 py-4 text-base text-slate-900">
            <button
              type="button"
              onClick={() => navigate("/coordinator")}
              className="mb-1 block w-full px-3 py-2 text-left hover:bg-slate-100"
            >
              Home
            </button>
            <button
              type="button"
              className="mb-1 block w-full bg-slate-200 px-3 py-2 text-left font-semibold"
            >
              Students
            </button>
          </nav>

          <div className="absolute bottom-4 px-4 text-sm text-slate-700">Technical Support Team, CCD, IITG</div>
        </aside>

        <main className="flex-1">
          <header className="flex items-center justify-end border-b bg-white px-5 py-3">
            <div className="mr-3 text-base text-blue-700">{adminEmail || "Admin"}</div>
            <button onClick={handleLogout} className="bg-slate-200 px-3 py-1 text-sm hover:bg-slate-300">Logout</button>
          </header>

          <div className="p-4">
            <div className="bg-white p-4">
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <h1 className="text-xl font-semibold text-slate-900">Student Details: {student.name || "-"}</h1>
                <button
                  type="button"
                  onClick={() => navigate("/coordinator")}
                  className="border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Back to Coordinator
                </button>
              </div>

              <div className="mb-4 border-b bg-slate-50 px-4 py-2">
                <div className="flex flex-wrap gap-2">
                  {TAB_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`px-3 py-1.5 text-sm ${tab === key ? "bg-blue-600 text-white" : "border border-slate-300 bg-white"}`}
                    >
                      {TAB_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-sm">
                {tab === "basic" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoRow label="Name" value={student.name} />
                    <InfoRow label="Email" value={student.email} />
                    <InfoRow label="Roll Number" value={student.roll_number} />
                    <InfoRow label="Programme" value={student.programme} />
                    <InfoRow label="Major" value={student.major} />
                    <InfoRow label="Minor" value={student.minor} />
                    <InfoRow label="Gender" value={student.gender} />
                    <InfoRow label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString() : "-"} />
                    <InfoRow label="Nationality" value={student.nationality} />
                    <InfoRow label="Category" value={student.category} />
                    <InfoRow label="Mobile (Campus)" value={student.mobile_campus} />
                    <InfoRow label="Mobile (Alt)" value={student.mobile_campus_alt} />
                  </div>
                )}

                {tab === "address" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoRow label="Hostel" value={student.hostel} />
                    <InfoRow label="Room Number" value={student.room_number} />
                    <InfoRow label="Flat/House Number" value={student.flat_no} />
                    <InfoRow label="Address" value={student.address} />
                    <InfoRow label="City" value={student.city} />
                    <InfoRow label="State" value={student.state} />
                    <InfoRow label="Pincode" value={student.pincode} />
                    <InfoRow label="Mobile (Home)" value={student.mobile_home} />
                  </div>
                )}

                {tab === "education" && (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <InfoRow label="Major CPI" value={student.major_cpi} />
                      <InfoRow label="Minor CPI" value={student.minor_cpi} />
                      <InfoRow label="Year of Admission" value={student.year_of_admission} />
                      <InfoRow label="Year of Minor Admission" value={student.year_of_minor_admission} />
                    </div>
                    <div>
                      <p className="mb-2 font-semibold text-slate-700">Semester-wise SPI</p>
                      <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
                        {Object.entries(student.semester_wise_spi || {}).map(([key, value]) => (
                          <div key={key} className="border border-slate-200 px-3 py-2">
                            <span className="font-semibold">{key.toUpperCase().replace("_", " ")}: </span>
                            <span>{value || "-"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 font-semibold text-slate-700">Schooling</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <InfoRow label="Class X Percentage" value={student.schooling?.x_percentage} />
                        <InfoRow label="Class XII Percentage" value={student.schooling?.xii_percentage} />
                        <InfoRow label="Class X Pass Year" value={student.schooling?.x_pass_year} />
                        <InfoRow label="Class XII Pass Year" value={student.schooling?.xii_pass_year} />
                        <InfoRow label="Class X Board" value={student.schooling?.x_board} />
                        <InfoRow label="Class XII Board" value={student.schooling?.xii_exam_board} />
                      </div>
                    </div>
                  </div>
                )}

                {tab === "documents" && (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 font-semibold text-slate-700">Profile Picture</p>
                      {student.profile_pic ? (
                        <a
                          href={getImageUrl(student.profile_pic) || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          Open profile picture
                        </a>
                      ) : (
                        <p>-</p>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 font-semibold text-slate-700">CVs</p>
                      {cvEntries.length ? (
                        <div className="space-y-2">
                          {cvEntries.map((item) => (
                            <div key={item.label}>
                              <a
                                href={getCvUrl(item.value) || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 underline"
                              >
                                {item.label}
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No CV uploaded.</p>
                      )}
                    </div>

                    <InfoRow label="Drive Link" value={student.cv?.drive_Link} />
                    <InfoRow label="Portfolio Link" value={student.cv?.portfolio_Link} />
                  </div>
                )}

                {tab === "declaration" && (
                  <div className="space-y-3">
                    <InfoRow label="Registration Complete" value={student.registration_complete ? "Yes" : "No"} />
                    <InfoRow label="Is Registered" value={student.is_registered ? "Yes" : "No"} />
                    <InfoRow label="CV Verified" value={student.cv_verified ? "Yes" : "No"} />
                    <InfoRow label="Status" value={student.status} />
                    <InfoRow label="Last Updated" value={student.updatedAt ? new Date(student.updatedAt).toLocaleString() : "-"} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
