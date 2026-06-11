import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import iitgBg from "../assets/iitg_bg.png";
import {
  API_BASE,
  authHeaders,
  authHeadersFormData,
  clearSession,
  getRole,
  getToken,
} from "../utils/auth";

const campusBgStyle = {
  backgroundImage: `linear-gradient(rgba(17, 24, 39, 0.58), rgba(17, 24, 39, 0.58)), url(${iitgBg})`,
};

// ─── Deadline countdown banner ────────────────────────────────────────────────
function DeadlineBanner({ deadline }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    const target = new Date(deadline.deadline_date);
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Deadline has passed");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s remaining`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;
  return (
    <p
      className={`text-right text-xs md:text-sm mb-8 ${
        expired ? "text-red-400" : "text-amber-400"
      }`}
    >
      {deadline.title}:{" "}
      <span className="font-semibold">
        {new Date(deadline.deadline_date).toLocaleString()}
      </span>{" "}
      &nbsp;|&nbsp;
      <span className="font-bold">{timeLeft}</span>
    </p>
  );
}

// ─── Welcome / Login screen (not logged in) ───────────────────────────────────
function WelcomeScreen({ deadline, onLogin, loading }) {
  const deadlineExpired =
    deadline && new Date() > new Date(deadline.deadline_date);

  return (
    <div
      className="campus-bg min-h-screen w-full flex items-center justify-center p-4"
      style={campusBgStyle}
    >
      <div className="glass-card w-full max-w-4xl rounded-2xl p-8 md:p-12 text-slate-900">
        {/* Deadline line */}
        {deadline ? (
          <DeadlineBanner deadline={deadline} />
        ) : (
          <p className="text-right text-xs md:text-sm text-slate-500 mb-8">
            No submission deadline set yet
          </p>
        )}

        {/* Logo + title */}
        <div className="flex justify-center mb-6">
          <img
            src={`${process.env.PUBLIC_URL}/iitg.png`}
            alt="IITG"
            className="h-20 w-20 md:h-24 md:w-24 object-contain"
          />
        </div>

        <h1 className="text-center text-3xl md:text-4xl font-bold text-slate-900">
          Placement Portal
        </h1>
        <h2 className="text-center text-xl md:text-2xl font-semibold text-[var(--brand)] mt-1">
          Photo Collection
        </h2>
        <p className="text-center text-slate-600 mt-3 text-sm md:text-base">
          Centre for Career Development, IIT Guwahati
        </p>

        {/* Info bullets */}
        <div className="mt-8 mx-auto max-w-lg rounded-xl border border-slate-200 bg-white/70 px-6 py-5 text-sm text-slate-700 space-y-2">
          <p className="font-semibold text-slate-800 mb-2">Instructions:</p>
          <p>• This photo will be printed on your <strong>Placement ID Card</strong></p>
          <p>• Upload a <strong>professional, formal photograph</strong></p>
          <p>• Photo will be resized to <strong>500 × 400 pixels</strong> automatically</p>
          {/* <p>• Wear formal attire — plain light background preferred</p> */}
          <p>• Accepted formats: <strong>JPEG / PNG</strong> &nbsp;|&nbsp; Max: <strong>5 MB</strong></p>
        </div>

        {deadlineExpired && (
          <p className="mt-6 text-center text-sm font-semibold text-red-600">
            The submission deadline has passed. Photo uploads are closed.
          </p>
        )}

        {/* Login button */}
        <div className="mt-10 flex items-center justify-center">
          <button
            type="button"
            onClick={onLogin}
            disabled={loading}
            className="rounded-md bg-[var(--brand)] px-10 py-3 text-white font-semibold hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? "Redirecting…" : "Login with IITG Outlook"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Only registered PG students can access this portal
        </p>
      </div>
    </div>
  );
}

// ─── Submission success card (photo already uploaded) ─────────────────────────
function SubmissionSuccessView({ profile, deadline, canEdit, onEdit, onLogout, photoUrl }) {
  return (
    <div
      className="campus-bg min-h-screen w-full flex items-center justify-center p-4"
      style={campusBgStyle}
    >
      <div className="glass-card w-full max-w-3xl rounded-2xl p-8 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-end gap-3 mb-4 text-sm">
          <span className="text-slate-600">{profile?.name || profile?.email || "Student"}</span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md bg-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-300"
          >
            Logout
          </button>
        </div>

        <h2 className="text-3xl font-bold text-center">Photo Submitted</h2>
        <p className="mt-3 text-center text-lg text-slate-700">Thank you.</p>
        <p className="mt-2 text-center text-sm text-slate-600">
          {canEdit
            ? "You can still update your photo before the deadline."
            : "The deadline has passed. You can view your submitted photo."}
        </p>

        {/* Submitted photo */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <img
            src={photoUrl}
            alt="Submitted profile"
            className="rounded-lg border-2 border-[var(--brand)] object-cover shadow-md"
            style={{ width: 250, height: 200 }}
          />
          <p className="text-xs text-slate-500">Your submitted photo (500 × 400 px)</p>
        </div>

        {/* Details summary */}
        <div className="mt-5 mx-auto max-w-sm rounded-xl border border-slate-200 bg-white/70 px-5 py-4 text-sm space-y-1">
          <div><span className="font-medium">Email:</span> {profile?.email}</div>
          <div><span className="font-medium">Name:</span> {profile?.name || "—"}</div>
          <div><span className="font-medium">Roll Number:</span> {profile?.roll_number || "—"}</div>
        </div>

        {canEdit && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md bg-[var(--brand)] px-6 py-2 text-white font-semibold hover:opacity-90 transition"
            >
              Update Photo / Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main registration form (logged in, editing) ──────────────────────────────
function RegistrationForm({ profile, deadline, onLogout, onSubmitted }) {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: profile?.name || "",
    roll_number: profile?.roll_number || "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  const deadlineExpired = deadline && new Date() > new Date(deadline.deadline_date);
  const canEdit = !deadlineExpired;

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast.error("Only JPEG and PNG images are allowed");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be smaller than 5 MB");
      e.target.value = "";
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveAndUpload = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.roll_number.trim()) { toast.error("Roll number is required"); return; }
    if (!photoFile) { toast.error("Please select a photo to upload"); return; }

    setStatus("");

    // 1) Save profile details
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/pg/profile`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ name: form.name.trim(), roll_number: form.roll_number.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save details");
    } catch (err) {
      toast.error(err.message || "Failed to save details");
      setSaving(false);
      return;
    } finally {
      setSaving(false);
    }

    // 2) Upload photo
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("profile_photo", photoFile);
      const res = await fetch(`${API_BASE}/pg/upload/photo`, {
        method: "POST",
        headers: authHeadersFormData(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Photo upload failed");
      toast.success("Photo submitted successfully!");
      onSubmitted(data.student);
    } catch (err) {
      toast.error(err.message || "Photo upload failed");
      setStatus(err.message || "Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const isBusy = saving || uploading;

  return (
    <div
      className="campus-bg min-h-screen w-full flex items-center justify-center p-2 sm:p-3 md:p-4"
      style={campusBgStyle}
    >
      <div className="glass-card w-full sm:max-w-3xl md:max-w-4xl rounded-2xl p-4 md:p-6 text-slate-900 max-h-[calc(100vh-1rem)] md:max-h-[88vh] overflow-y-auto overflow-x-hidden hide-scrollbar">

        {/* Header row */}
        <div className="flex items-center justify-end gap-3 mb-4 text-sm">
          <span className="text-slate-600">{profile?.name || profile?.email || "Student"}</span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md bg-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-300"
          >
            Logout
          </button>
        </div>

        {/* Deadline status line */}
        <p className={`text-right text-xs md:text-sm mb-5 ${canEdit ? "text-emerald-600" : "text-red-500"}`}>
          {canEdit ? "Submission open before deadline" : "Deadline passed — submission closed"}
        </p>

        {/* Page title */}
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Placement Portal Photo Collection</h2>
          <p className="text-sm text-slate-500 mt-1">
            Fill your details and upload your photo for the Placement ID card.
          </p>
        </div>

        {/* Deadline info card */}
        {deadline && (
          <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${deadlineExpired ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            <span className="font-semibold">{deadline.title}:</span>{" "}
            {new Date(deadline.deadline_date).toLocaleString()}
            {deadlineExpired && <span className="ml-2 font-bold">(CLOSED)</span>}
          </div>
        )}

        {/* Read-only info block (like ReadOnlyAcademics in intern form) */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-semibold mb-3">Account Details (Read Only)</h3>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Email:</span> {profile?.email || "—"}</div>
            <div><span className="font-medium">Status:</span>{" "}
              <span className={`font-semibold ${profile?.profile_photo ? "text-emerald-600" : "text-amber-600"}`}>
                {profile?.profile_photo ? "Photo submitted" : "Photo not yet uploaded"}
              </span>
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="grid md:grid-cols-2 gap-3 text-sm mb-5">
          <label className="flex flex-col gap-1">
            <span>Full Name <span className="text-red-500">*</span></span>
            <input
              className="rounded border border-slate-300 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-400"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter your full name"
              disabled={!canEdit || isBusy}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Roll Number <span className="text-red-500">*</span></span>
            <input
              className="rounded border border-slate-300 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-400"
              value={form.roll_number}
              onChange={(e) => setForm((p) => ({ ...p, roll_number: e.target.value }))}
              placeholder="e.g. 246102001"
              disabled={!canEdit || isBusy}
            />
          </label>
        </div>

        {/* Photo upload section */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 mb-5">
          <h3 className="text-base font-semibold mb-1">Upload Profile Photo</h3>
          <p className="text-xs text-slate-500 mb-3">
            Please ensure the photo you upload is a <strong>professional/formal photograph</strong>.
            It will be automatically resized to <strong>500 × 400 px</strong> and printed on your Placement ID card.
          </p>

          {/* Instructions like step-4 of intern form */}
          <div className="mb-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 space-y-1">
            {/* <p>• Wear <strong>formal attire</strong> (shirt/kurta for men, formal dress for women)</p> */}
            <p>• <strong>Plain, light background</strong> preferred (white or off-white)</p>
            <p>• Face should be clearly visible — no sunglasses</p>
            <p>• Accepted formats: <strong>JPEG, PNG</strong> &nbsp;|&nbsp; Max size: <strong>5 MB</strong></p>
          </div>

          {!deadlineExpired ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handlePhotoChange}
                disabled={isBusy}
                className="rounded border border-slate-300 px-3 py-2 bg-white w-full text-sm disabled:opacity-50"
              />

              {/* Preview */}
              {photoPreview && (
                <div className="mt-3 flex flex-col items-start gap-1">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="rounded-lg border border-slate-300 object-cover"
                    style={{ width: 200, height: 160 }}
                  />
                  <p className="text-xs text-slate-400">Preview — will be cropped to 500×400 on upload</p>
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-xs text-red-500 underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Currently uploaded photo */}
              {profile?.profile_photo && !photoPreview && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-600 mb-1">Currently uploaded photo:</p>
                  <img
                    src={`${API_BASE}/pg-image/${encodeURIComponent(profile.profile_photo)}`}
                    alt="Current photo"
                    className="rounded-lg border border-slate-300 object-cover"
                    style={{ width: 200, height: 160 }}
                  />
                </div>
              )}
            </>
          ) : (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              The deadline has passed. Photo upload is no longer available.
            </p>
          )}
        </div>

        {/* Status message */}
        {status && (
          <p className={`mt-2 text-sm ${status.toLowerCase().includes("success") ? "text-emerald-600" : "text-red-600"}`}>
            {status}
          </p>
        )}

        {/* Submit button */}
        {canEdit && (
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveAndUpload}
              disabled={isBusy || !photoFile}
              className="rounded-md bg-[var(--brand)] px-8 py-2.5 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {isBusy ? (saving ? "Saving details…" : "Uploading photo…") : "Save & Submit Photo"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root page component ──────────────────────────────────────────────────────
export default function PgRegistrationPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const isLoggedIn = !!(getToken() && getRole() === "pg_student");

  const fetchDeadline = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/pg/deadline`);
      const data = await res.json();
      setDeadline(data.deadline || null);
    } catch {}
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/pg/profile`, { headers: authHeaders() });
      if (res.status === 401 || res.status === 403) {
        clearSession();
        navigate("/", { replace: true });
        return;
      }
      const data = await res.json();
      setProfile(data);
    } catch {
      toast.error("Failed to load profile");
    }
  }, [navigate]);

  useEffect(() => {
    const init = async () => {
      await fetchDeadline();
      if (isLoggedIn) await fetchProfile();
      setLoading(false);
    };
    init();
  }, [isLoggedIn, fetchDeadline, fetchProfile]);

  const handleLogin = () => {
    setLoginLoading(true);
    window.location.href = `${API_BASE}/auth/outlook/login`;
  };

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="campus-bg min-h-screen w-full flex items-center justify-center" style={campusBgStyle}>
        <div className="glass-card rounded-2xl px-10 py-8 text-slate-900">Loading…</div>
      </div>
    );
  }

  // Not logged in
  if (!isLoggedIn) {
    return (
      <WelcomeScreen
        deadline={deadline}
        onLogin={handleLogin}
        loading={loginLoading}
      />
    );
  }

  // Logged in + photo already submitted + not in edit mode → success screen
  if (profile?.profile_photo && !showForm) {
    const deadlineExpired = deadline && new Date() > new Date(deadline.deadline_date);
    return (
      <SubmissionSuccessView
        profile={profile}
        deadline={deadline}
        canEdit={!deadlineExpired}
        photoUrl={`${API_BASE}/pg-image/${encodeURIComponent(profile.profile_photo)}`}
        onLogout={handleLogout}
        onEdit={() => setShowForm(true)}
      />
    );
  }

  // Logged in → show registration form
  return (
    <RegistrationForm
      profile={profile}
      deadline={deadline}
      onLogout={handleLogout}
      onSubmitted={(updatedStudent) => {
        setProfile(updatedStudent);
        setShowForm(false);
      }}
    />
  );
}
