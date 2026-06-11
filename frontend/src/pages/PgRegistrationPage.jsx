import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { API_BASE, authHeaders, authHeadersFormData, clearSession, getRole, getToken } from "../utils/auth";
import iitgBg from "../assets/iitg_bg.png";

const PHOTO_WIDTH = 500;
const PHOTO_HEIGHT = 400;

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
    <div className={`mb-4 rounded-sm border px-4 py-3 text-sm font-medium ${expired ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
      <span className="font-semibold">{deadline.title}: </span>
      {new Date(deadline.deadline_date).toLocaleString()} &nbsp;|&nbsp;
      <span className={expired ? "text-red-700 font-bold" : "text-amber-700 font-bold"}>{timeLeft}</span>
    </div>
  );
}

function PhotoPreview({ src, onRemove }) {
  if (!src) return null;
  return (
    <div className="mt-3 flex flex-col items-start gap-2">
      <img
        src={src}
        alt="Preview"
        className="border border-slate-300 object-cover"
        style={{ width: PHOTO_WIDTH / 2, height: PHOTO_HEIGHT / 2 }}
      />
      <p className="text-xs text-slate-500">Preview ({PHOTO_WIDTH}×{PHOTO_HEIGHT} after upload)</p>
      <button type="button" onClick={onRemove} className="text-xs text-red-600 underline">Remove</button>
    </div>
  );
}

export default function PgRegistrationPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [deadlineExpired, setDeadlineExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({ name: "", roll_number: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const isLoggedIn = getToken() && getRole() === "pg_student";

  const fetchDeadline = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/pg/deadline`);
      const data = await res.json();
      setDeadline(data.deadline || null);
      if (data.deadline) {
        setDeadlineExpired(new Date() > new Date(data.deadline.deadline_date));
      }
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
      setForm({ name: data.name || "", roll_number: data.roll_number || "" });
    } catch {
      toast.error("Failed to load profile");
    }
  }, [navigate]);

  useEffect(() => {
    fetchDeadline();
    if (isLoggedIn) {
      fetchProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, fetchDeadline, fetchProfile]);

  const handleLoginRedirect = () => {
    window.location.href = `${API_BASE}/auth/outlook/login`;
  };

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast.error("Only JPEG and PNG images are allowed");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be smaller than 5MB");
      e.target.value = "";
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.roll_number.trim()) {
      toast.error("Roll number is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/pg/profile`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ name: form.name.trim(), roll_number: form.roll_number.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save profile");
      setProfile(data.student);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) {
      toast.error("Please select a photo first");
      return;
    }

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
      if (!res.ok) throw new Error(data.message || "Upload failed");

      toast.success("Photo uploaded successfully! It has been resized to 500×400.");
      setProfile(data.student);
      setPhotoFile(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getPhotoUrl = (filename) => {
    if (!filename) return null;
    return `${API_BASE}/pg-image/${encodeURIComponent(filename)}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  // Not logged in — show login screen
  if (!isLoggedIn) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4"
        style={{ backgroundImage: `url(${iitgBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="w-full max-w-md rounded-sm bg-white/95 p-8 shadow-2xl">
          <div className="mb-6 flex justify-center">
            <img
              src={`${process.env.PUBLIC_URL}/iitg.png`}
              alt="IITG"
              className="h-20 w-20 object-contain"
            />
          </div>

          <h1 className="mb-1 text-center text-2xl font-bold text-slate-900">PG Photo Registration</h1>
          <p className="mb-6 text-center text-sm text-slate-500">Centre for Career Development, IIT Guwahati</p>

          {deadline && (
            <div className={`mb-5 rounded-sm border px-3 py-2 text-xs ${deadlineExpired ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}>
              <strong>Deadline:</strong> {new Date(deadline.deadline_date).toLocaleString()}
              {deadlineExpired && <span className="ml-2 font-bold">(CLOSED)</span>}
            </div>
          )}

          <p className="mb-5 text-sm text-slate-600">
            Login with your IITG Outlook email to submit your photo for the placement ID card.
            Only registered PG students can access this portal.
          </p>

          <button
            type="button"
            onClick={handleLoginRedirect}
            className="w-full rounded-sm bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Login with IITG Outlook
          </button>
        </div>
      </div>
    );
  }

  // Logged in — show registration form
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={`${process.env.PUBLIC_URL}/iitg.png`} alt="IITG" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">PG Photo Registration</h1>
            <p className="text-xs text-slate-500">Centre for Career Development, IIT Guwahati</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{profile?.email}</span>
          <button onClick={handleLogout} className="bg-slate-200 px-3 py-1 text-sm hover:bg-slate-300">Logout</button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-5">
        <DeadlineBanner deadline={deadline} />

        {/* Status card */}
        {profile?.profile_photo && (
          <div className="mb-4 flex items-center gap-4 rounded-sm border border-green-200 bg-green-50 px-4 py-3">
            <img
              src={getPhotoUrl(profile.profile_photo)}
              alt="Your photo"
              className="h-16 w-20 object-cover border border-green-300"
            />
            <div>
              <p className="font-semibold text-green-800">Photo submitted!</p>
              <p className="text-sm text-green-700">Your photo has been successfully uploaded and will be used on your placement ID card.</p>
              {!deadlineExpired && <p className="mt-1 text-xs text-slate-500">You can still update it before the deadline.</p>}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-5 rounded-sm border border-blue-200 bg-blue-50 px-4 py-4">
          <h2 className="mb-2 font-semibold text-blue-900">Photo Instructions</h2>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Upload a <strong>professional, formal photograph</strong> — this will be printed on your Placement ID card</li>
            <li>• Photo will be automatically resized to <strong>500 × 400 pixels</strong></li>
            <li>• Wear formal attire (shirt/kurta for men, formal dress for women)</li>
            <li>• Plain light background preferred (white/off-white)</li>
            <li>• Face should be clearly visible, no sunglasses</li>
            <li>• Accepted formats: <strong>JPEG, PNG</strong> &nbsp;|&nbsp; Max size: <strong>5 MB</strong></li>
          </ul>
        </div>

        {/* Profile form */}
        <div className="rounded-sm bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Your Details</h2>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email (cannot be changed)</label>
              <input
                type="email"
                value={profile?.email || ""}
                readOnly
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                disabled={deadlineExpired}
                placeholder="Enter your full name"
                className="w-full border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Roll Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.roll_number}
                onChange={(e) => setForm((p) => ({ ...p, roll_number: e.target.value }))}
                disabled={deadlineExpired}
                placeholder="e.g. 246102001"
                className="w-full border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                required
              />
            </div>

            {!deadlineExpired && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Details"}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Photo upload */}
        <div className="mt-4 rounded-sm bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Profile Photo</h2>
          <p className="mb-4 text-xs text-slate-500">
            Upload your photo below. It will be automatically cropped and resized to <strong>500 × 400 px</strong>.
          </p>

          {deadlineExpired ? (
            <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              The deadline has passed. Photo upload is no longer available.
            </p>
          ) : (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handlePhotoChange}
                className="block w-full border border-slate-300 p-2 text-sm"
              />

              <PhotoPreview src={photoPreview} onRemove={handleRemovePhoto} />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleUploadPhoto}
                  disabled={!photoFile || uploading}
                  className="bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Photo"}
                </button>
              </div>
            </div>
          )}

          {/* Current uploaded photo */}
          {profile?.profile_photo && !photoPreview && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Currently uploaded photo:</p>
              <img
                src={getPhotoUrl(profile.profile_photo)}
                alt="Current profile"
                className="border border-slate-300 object-cover"
                style={{ width: PHOTO_WIDTH / 2, height: PHOTO_HEIGHT / 2 }}
              />
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          For technical support contact: ccd.techsupport@iitg.ac.in
        </p>
      </main>
    </div>
  );
}
