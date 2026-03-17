import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, authHeaders, clearSession } from "../utils/auth";
import toast from "react-hot-toast";

const steps = ["Basic Info", "Home Address", "Education", "Documents", "Declaration"];

const campusBgStyle = {
  backgroundImage: `linear-gradient(rgba(17, 24, 39, 0.58), rgba(17, 24, 39, 0.58)), url(${process.env.PUBLIC_URL}/iitg_bg.png)`,
};

const EMPTY_EDITABLE = {
  gender: "",
  dob: "",
  mobile_campus: "",
  mobile_campus_alt: "",
  alt_email: "",
  nationality: "Indian",
  linkedin_url: "",
  category: "",
  hostel: "",
  room_number: "",
  flat_no: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  x_percentage: "",
  x_pass_year: "",
  x_board: "",
  x_exam_medium: "",
  xii_percentage: "",
  xii_pass_year: "",
  xii_exam_board: "",
  xii_exam_medium: "",
  gap: "",
  reason_gap: "",
  entrance_examination: "",
  rank_category: "",
  jee_ma_gate_rank: "",
  portfolio_Link: "",
  drive_Link: "",
};

const toNumberOrUndefined = (value) =>
  value === "" || value === null || value === undefined ? undefined : Number(value);

const toUploadUrl = (type, value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}/${type}/${encodeURIComponent(value)}`;
};

function UploadedDocumentsView({ student }) {
  const profilePicUrl = toUploadUrl("image", student?.profile_pic);
  const cvTechUrl = toUploadUrl("cv", student?.cv?.tech);
  const cvNonTechUrl = toUploadUrl("cv", student?.cv?.non_tech);
  const cvCoreUrl = toUploadUrl("cv", student?.cv?.core);
  const driveLink = student?.cv?.drive_Link || "";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-semibold mb-3">Uploaded Documents</h3>

      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium mb-2">Profile Photo</p>
          {profilePicUrl ? (
            <a href={profilePicUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              View Uploaded Photo
            </a>
          ) : (
            <p className="text-slate-500">No photo uploaded</p>
          )}
        </div>

        <div>
          <p className="font-medium mb-2">Uploaded CVs</p>
          <div className="space-y-1">
            {cvTechUrl ? <a href={cvTechUrl} target="_blank" rel="noreferrer" className="block text-blue-600 underline">Tech CV</a> : null}
            {cvNonTechUrl ? <a href={cvNonTechUrl} target="_blank" rel="noreferrer" className="block text-blue-600 underline">Non-Tech CV</a> : null}
            {cvCoreUrl ? <a href={cvCoreUrl} target="_blank" rel="noreferrer" className="block text-blue-600 underline">Core CV</a> : null}
            {!cvTechUrl && !cvNonTechUrl && !cvCoreUrl ? <p className="text-slate-500">No CV uploaded</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm">
        <span className="font-medium">Drive Link: </span>
        {driveLink ? (
          <a href={driveLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open Drive Link</a>
        ) : (
          <span className="text-slate-500">Not provided</span>
        )}
      </div>
    </div>
  );
}

function ReadOnlyAcademics({ student }) {
  const spiEntries = useMemo(
    () => Object.entries(student?.semester_wise_spi || {}).filter(([, v]) => v),
    [student]
  );

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-semibold mb-3">Institute Records (Read Only)</h3>
      <div className="grid md:grid-cols-2 gap-2 text-sm">
        <div><span className="font-medium">Name:</span> {student?.name || "-"}</div>
        <div><span className="font-medium">Email:</span> {student?.email || "-"}</div>
        <div><span className="font-medium">Roll Number:</span> {student?.roll_number || "-"}</div>
        <div><span className="font-medium">Programme:</span> {student?.programme || "-"}</div>
        <div><span className="font-medium">Major:</span> {student?.major || "-"}</div>
        <div><span className="font-medium">Minor:</span> {student?.minor || "-"}</div>
        <div><span className="font-medium">Major CPI:</span> {student?.major_cpi ?? "-"}</div>
        <div><span className="font-medium">Minor CPI:</span> {student?.minor_cpi ?? "-"}</div>
      </div>

      <div className="mt-3 text-sm">
        <p className="font-medium mb-2">Semester-wise SPI (Read Only)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {spiEntries.length === 0 ? (
            <p className="text-slate-500">No SPI values available.</p>
          ) : (
            spiEntries.map(([key, value]) => (
              <div key={key} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                {key.toUpperCase()}: {value}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onStart, studentName, onLogout }) {
  return (
    <div className="campus-bg min-h-screen w-full flex items-center justify-center p-4" style={campusBgStyle}>
      <div className="glass-card w-full max-w-4xl rounded-2xl p-8 md:p-12 text-slate-900">
        <div className="flex items-center justify-end gap-3 mb-4 text-sm">
          <span className="text-slate-600">{studentName || "Student"}</span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md bg-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-300"
          >
            Logout
          </button>
        </div>

        <p className="text-right text-xs md:text-sm text-red-400 mb-8">
          Complete your profile before CV verification deadline
        </p>

        <h1 className="text-center text-3xl font-bold">Complete Your Internship Profile</h1>
        <p className="text-center text-slate-600 mt-3">Takes about 5-7 minutes</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-400 text-[11px]">
                {index + 1}
              </span>
              <span>{step}</span>
              {index < steps.length - 1 && <span className="h-px w-8 bg-slate-300" />}
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center">
          <button
            onClick={onStart}
            className="rounded-md bg-[var(--brand)] px-10 py-3 text-white font-semibold hover:opacity-90 transition"
          >
            Setup Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmissionSuccessView({ canEdit, onReview, studentName, onLogout, student }) {
  return (
    <div className="campus-bg min-h-screen w-full flex items-center justify-center p-4" style={campusBgStyle}>
      <div className="glass-card w-full max-w-3xl rounded-2xl p-8 text-slate-900">
        <div className="flex items-center justify-end gap-3 mb-4 text-sm">
          <span className="text-slate-600">{studentName || "Student"}</span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md bg-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-300"
          >
            Logout
          </button>
        </div>

        <h2 className="text-3xl font-bold text-center">Details Submitted</h2>
        <p className="mt-3 text-center text-lg">Thank you.</p>
        <p className="mt-4 text-center text-sm text-slate-600">
          {canEdit
            ? "You can still review and edit details until the deadline."
            : "Deadline has been passed. You can review details but cannot edit now."}
        </p>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onReview}
            className="rounded-md bg-[var(--brand)] px-6 py-2 text-white font-semibold"
          >
            Review Details
          </button>
        </div>

        <div className="mt-6">
          <UploadedDocumentsView student={student} />
        </div>
      </div>
    </div>
  );
}

function BasicInfoForm({ onBack, initialProfile, initialCanEdit, initialSubmitted, studentName, onLogout }) {
  const [student, setStudent] = useState(initialProfile || null);
  const [form, setForm] = useState(EMPTY_EDITABLE);
  const [loading, setLoading] = useState(!initialProfile);
  const [canEdit, setCanEdit] = useState(typeof initialCanEdit === "boolean" ? initialCanEdit : true);
  const [status, setStatus] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [cvFile, setCvFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [acceptNoDisciplinary, setAcceptNoDisciplinary] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(initialSubmitted));

  useEffect(() => {
    if (initialProfile) {
      const schooling = initialProfile.schooling || {};
      const cv = initialProfile.cv || {};

      setForm({
        gender: initialProfile.gender || "",
        dob: initialProfile.dob ? new Date(initialProfile.dob).toISOString().slice(0, 10) : "",
        mobile_campus: initialProfile.mobile_campus || "",
        mobile_campus_alt: initialProfile.mobile_campus_alt || "",
        alt_email: initialProfile.alt_email || "",
        nationality: initialProfile.nationality || "Indian",
        linkedin_url: initialProfile.linkedin_url || "",
        category: initialProfile.category || "",
        hostel: initialProfile.hostel || "",
        room_number: initialProfile.room_number || "",
        flat_no: initialProfile.flat_no || "",
        address: initialProfile.address || "",
        city: initialProfile.city || "",
        state: initialProfile.state || "",
        pincode: initialProfile.pincode || "",
        x_percentage: schooling.x_percentage ?? "",
        x_pass_year: schooling.x_pass_year ?? "",
        x_board: schooling.x_board || "",
        x_exam_medium: schooling.x_exam_medium || "",
        xii_percentage: schooling.xii_percentage ?? "",
        xii_pass_year: schooling.xii_pass_year ?? "",
        xii_exam_board: schooling.xii_exam_board || "",
        xii_exam_medium: schooling.xii_exam_medium || "",
        gap: schooling.gap ?? "",
        reason_gap: schooling.reason_gap || "",
        entrance_examination: initialProfile.entrance_examination || "",
        rank_category: initialProfile.rank_category || "",
        jee_ma_gate_rank: initialProfile.jee_ma_gate_rank ?? "",
        portfolio_Link: cv.portfolio_Link || "",
        drive_Link: cv.drive_Link || "",
      });
    }
  }, [initialProfile]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/student/profile`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load profile");

        setStudent(data.student);
        setCanEdit(Boolean(data.canEdit));
        setSubmitted(Boolean(data.student.registration_complete));

        const schooling = data.student.schooling || {};
        const cv = data.student.cv || {};

        setForm({
          gender: data.student.gender || "",
          dob: data.student.dob ? new Date(data.student.dob).toISOString().slice(0, 10) : "",
          mobile_campus: data.student.mobile_campus || "",
          mobile_campus_alt: data.student.mobile_campus_alt || "",
          alt_email: data.student.alt_email || "",
          nationality: data.student.nationality || "Indian",
          linkedin_url: data.student.linkedin_url || "",
          category: data.student.category || "",
          hostel: data.student.hostel || "",
          room_number: data.student.room_number || "",
          flat_no: data.student.flat_no || "",
          address: data.student.address || "",
          city: data.student.city || "",
          state: data.student.state || "",
          pincode: data.student.pincode || "",
          x_percentage: schooling.x_percentage ?? "",
          x_pass_year: schooling.x_pass_year ?? "",
          x_board: schooling.x_board || "",
          x_exam_medium: schooling.x_exam_medium || "",
          xii_percentage: schooling.xii_percentage ?? "",
          xii_pass_year: schooling.xii_pass_year ?? "",
          xii_exam_board: schooling.xii_exam_board || "",
          xii_exam_medium: schooling.xii_exam_medium || "",
          gap: schooling.gap ?? "",
          reason_gap: schooling.reason_gap || "",
          entrance_examination: data.student.entrance_examination || "",
          rank_category: data.student.rank_category || "",
          jee_ma_gate_rank: data.student.jee_ma_gate_rank ?? "",
          portfolio_Link: cv.portfolio_Link || "",
          drive_Link: cv.drive_Link || "",
        });
      } catch (e) {
        setStatus(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [initialProfile]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = async () => {
    if (!canEdit) return;

    const payload = {
      gender: form.gender || undefined,
      dob: form.dob || undefined,
      mobile_campus: toNumberOrUndefined(form.mobile_campus),
      mobile_campus_alt: toNumberOrUndefined(form.mobile_campus_alt),
      alt_email: form.alt_email || undefined,
      nationality: form.nationality || undefined,
      linkedin_url: form.linkedin_url || undefined,
      category: form.category || undefined,
      hostel: form.hostel || undefined,
      room_number: form.room_number || undefined,
      flat_no: form.flat_no || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      pincode: toNumberOrUndefined(form.pincode),
      schooling: {
        x_percentage: toNumberOrUndefined(form.x_percentage),
        x_pass_year: toNumberOrUndefined(form.x_pass_year),
        x_board: form.x_board || undefined,
        x_exam_medium: form.x_exam_medium || undefined,
        xii_percentage: toNumberOrUndefined(form.xii_percentage),
        xii_pass_year: toNumberOrUndefined(form.xii_pass_year),
        xii_exam_board: form.xii_exam_board || undefined,
        xii_exam_medium: form.xii_exam_medium || undefined,
        gap: toNumberOrUndefined(form.gap),
        reason_gap: form.reason_gap || undefined,
      },
      entrance_examination: form.entrance_examination || undefined,
      rank_category: form.rank_category || undefined,
      jee_ma_gate_rank: toNumberOrUndefined(form.jee_ma_gate_rank),
    };

    const res = await fetch(`${API_BASE}/student/profile`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Update failed");
    }

    setStudent(data.student);
    setStatus("Profile updated successfully.");
    toast.success("Profile saved");
  };

  const uploadDocuments = async () => {
    if (!canEdit) return;

    if (cvFile) {
      const cvData = new FormData();
      cvData.append("cv_tech", cvFile);
      const cvRes = await fetch(`${API_BASE}/student/upload/cv`, {
        method: "POST",
        headers: { Authorization: authHeaders().Authorization },
        body: cvData,
      });
      const cvResp = await cvRes.json();
      if (!cvRes.ok) throw new Error(cvResp.message || "CV upload failed");
      if (cvResp.student) setStudent(cvResp.student);
    }

    if (photoFile) {
      const photoData = new FormData();
      photoData.append("profile_pic", photoFile);
      const photoRes = await fetch(`${API_BASE}/student/upload/profile-pic`, {
        method: "POST",
        headers: { Authorization: authHeaders().Authorization },
        body: photoData,
      });
      const photoResp = await photoRes.json();
      if (!photoRes.ok) throw new Error(photoResp.message || "Photo upload failed");
      if (photoResp.student) setStudent(photoResp.student);
    }

    const linksRes = await fetch(`${API_BASE}/student/cv-links`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        drive_Link: form.drive_Link,
        portfolio_Link: form.portfolio_Link,
      }),
    });

    const linksResp = await linksRes.json();
    if (!linksRes.ok) throw new Error(linksResp.message || "Link save failed");
    if (linksResp.student) setStudent(linksResp.student);
  };

  const handleNext = async () => {
    setStatus("");

    try {
      if (!canEdit) {
        if (currentStep < 5) {
          setCurrentStep((prev) => Math.min(prev + 1, 5));
          return;
        }
        setStatus("Deadline has been passed. Cannot edit/submit now.");
        toast.error("Deadline has been passed. Cannot submit now.");
        return;
      }

      if (currentStep <= 3) {
        await saveProfile();
        setCurrentStep((prev) => Math.min(prev + 1, 5));
        return;
      }

      if (currentStep === 4) {
        await saveProfile();
        await uploadDocuments();
        setStatus("Documents saved successfully.");
        toast.success("Documents saved");
        setCurrentStep(5);
        return;
      }

      if (currentStep === 5) {
        if (!acceptPolicy || !acceptNoDisciplinary) {
          setStatus("Please accept all declarations before submitting.");
          return;
        }

        await saveProfile();
        const res = await fetch(`${API_BASE}/student/profile/complete`, {
          method: "POST",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Submission failed");

        setStatus("Profile submitted successfully.");
        setSubmitted(true);
        toast.success("Profile submitted successfully");
      }
    } catch (e) {
      setStatus(e.message || "Update failed");
      toast.error(e.message || "Update failed");
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
    }
  };

  if (loading) {
    return (
      <div className="campus-bg min-h-screen w-full flex items-center justify-center p-4" style={campusBgStyle}>
        <div className="glass-card w-full max-w-3xl rounded-2xl p-8 text-slate-900">Loading profile...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <SubmissionSuccessView
        canEdit={canEdit}
        studentName={student?.name || studentName}
        onLogout={onLogout}
        student={student}
        onReview={() => {
          setSubmitted(false);
          setCurrentStep(1);
          setStatus(canEdit ? "Review mode enabled. You can edit before deadline." : "Deadline has been passed. Review only.");
        }}
      />
    );
  }

  return (
    <div className="campus-bg min-h-screen w-full flex items-center justify-center p-2 sm:p-3 md:p-4" style={campusBgStyle}>
      <div className="glass-card w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl rounded-2xl p-4 md:p-6 text-slate-900 max-h-[calc(100vh-1rem)] md:max-h-[88vh] overflow-y-auto overflow-x-hidden hide-scrollbar">
        <div className="flex items-center justify-end gap-3 mb-4 text-sm">
          <span className="text-slate-600">{student?.name || studentName || "Student"}</span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md bg-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-300"
          >
            Logout
          </button>
        </div>

        <div className="flex items-center justify-between mb-5">
          <button onClick={handleBack} className="text-[var(--brand)] font-semibold">&larr; Back</button>
          <p className="text-sm text-emerald-600">
            {canEdit ? "Editable before deadline" : "Deadline passed - read only"}
          </p>
        </div>

        <div className="mb-3">
          <p className="text-slate-500 text-sm">Step {currentStep} of 5</p>
          <h2 className="text-2xl font-semibold">{steps[currentStep - 1]}</h2>
          <p className="text-xs text-slate-500 mt-1">Institute-record fields are visible but non-editable.</p>
        </div>

        {(currentStep === 1 || currentStep === 2) && <ReadOnlyAcademics student={student} />}

        {currentStep === 1 && (
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span>Gender *</span>
              <select className="rounded border border-slate-300 px-3 py-2 bg-white" value={form.gender} onChange={(e) => updateField("gender", e.target.value)} disabled={!canEdit}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Date of Birth *</span>
              <input className="rounded border border-slate-300 px-3 py-2" type="date" value={form.dob} onChange={(e) => updateField("dob", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Category *</span>
              <select className="rounded border border-slate-300 px-3 py-2 bg-white" value={form.category} onChange={(e) => updateField("category", e.target.value)} disabled={!canEdit}>
                <option value="">Select</option>
                <option value="General">General</option>
                <option value="OBC-NCL">OBC-NCL</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="Gen-EWS">Gen-EWS</option>
                <option value="General-PwD">General-PwD</option>
                <option value="SC-PwD">SC-PwD</option>
                <option value="ST-PwD">ST-PwD</option>
                <option value="OBC-PwD">OBC-PwD</option>
                <option value="EWS-PwD">EWS-PwD</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Mobile Number *</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.mobile_campus} onChange={(e) => updateField("mobile_campus", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Alternate Mobile Number</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.mobile_campus_alt} onChange={(e) => updateField("mobile_campus_alt", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Alternate Email</span>
              <input className="rounded border border-slate-300 px-3 py-2" type="email" value={form.alt_email} onChange={(e) => updateField("alt_email", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Nationality *</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.nationality} onChange={(e) => updateField("nationality", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span>LinkedIn Profile URL</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} disabled={!canEdit} />
            </label>
          </div>
        )}

        {currentStep === 2 && (
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span>Hostel (Current Address)</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.hostel} onChange={(e) => updateField("hostel", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Room Number (Current Address)</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.room_number} onChange={(e) => updateField("room_number", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Flat No. (Home Address)</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.flat_no} onChange={(e) => updateField("flat_no", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1 md:col-span-3">
              <span>Home Address</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.address} onChange={(e) => updateField("address", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>City</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.city} onChange={(e) => updateField("city", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>State</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.state} onChange={(e) => updateField("state", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Pincode</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} disabled={!canEdit} />
            </label>
          </div>
        )}

        {currentStep === 3 && (
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span>Class 10th Percentage</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.x_percentage} onChange={(e) => updateField("x_percentage", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Class 12th Percentage</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.xii_percentage} onChange={(e) => updateField("xii_percentage", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Class 10th Pass Year</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.x_pass_year} onChange={(e) => updateField("x_pass_year", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Class 12th Pass Year</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.xii_pass_year} onChange={(e) => updateField("xii_pass_year", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Class 10th Board</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.x_board} onChange={(e) => updateField("x_board", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Class 12th Board</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.xii_exam_board} onChange={(e) => updateField("xii_exam_board", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Class 10th Medium</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.x_exam_medium} onChange={(e) => updateField("x_exam_medium", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Class 12th Medium</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.xii_exam_medium} onChange={(e) => updateField("xii_exam_medium", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Gap in Study (years)</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.gap} onChange={(e) => updateField("gap", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1 md:col-span-1">
              <span>Entrance Exam</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.entrance_examination} onChange={(e) => updateField("entrance_examination", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span>Reason for Gap in Study</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.reason_gap} onChange={(e) => updateField("reason_gap", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Rank Category</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.rank_category} onChange={(e) => updateField("rank_category", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="flex flex-col gap-1">
              <span>Examination Category Rank</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={form.jee_ma_gate_rank} onChange={(e) => updateField("jee_ma_gate_rank", e.target.value)} disabled={!canEdit} />
            </label>
          </div>
        )}

        {currentStep === 4 && (
          <div className="grid gap-4 text-sm">
            <UploadedDocumentsView student={student} />

            <label className="flex flex-col gap-1">
              <span>Upload CV (PDF)</span>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                disabled={!canEdit}
                className="rounded border border-slate-300 px-3 py-2 bg-white"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Upload Photo</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                disabled={!canEdit}
                className="rounded border border-slate-300 px-3 py-2 bg-white"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Portfolio/Website/GitHub Link</span>
              <input
                className="rounded border border-slate-300 px-3 py-2"
                value={form.portfolio_Link}
                onChange={(e) => updateField("portfolio_Link", e.target.value)}
                disabled={!canEdit}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Google Drive Link for CV Verification</span>
              <input
                className="rounded border border-slate-300 px-3 py-2"
                value={form.drive_Link}
                onChange={(e) => updateField("drive_Link", e.target.value)}
                disabled={!canEdit}
              />
            </label>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4 text-sm">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptPolicy}
                onChange={(e) => setAcceptPolicy(e.target.checked)}
                className="mt-1"
              />
              <span>
                I hereby confirm that all information provided by me is correct and I shall be liable for consequences if any data provided turns out to be incorrect. I also confirm that I agree to the Internship Policy of CCD IITG. Click {" "}
                <a
                  href="https://drive.google.com/file/d/1rxjZan_emz_HzrSol00Y9TotapzMTJGM/view"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  here
                </a>{" "}
                to read the Internship policy.
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptNoDisciplinary}
                onChange={(e) => setAcceptNoDisciplinary(e.target.checked)}
                className="mt-1"
              />
              <span>
                I hereby confirm there is no SDC or IADC against me and I shall be liable for any consequences if there turns out to be any SDC or IADC against me.
              </span>
            </label>
          </div>
        )}

        {status && (
          <p className={`mt-4 text-sm ${status.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
            {status}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleNext}
            className="rounded-md bg-[var(--brand)] px-6 py-2 text-white font-medium"
          >
            {currentStep < 5 ? "Next" : "Submit Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentPage() {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialProfile, setInitialProfile] = useState(null);
  const [initialCanEdit, setInitialCanEdit] = useState(true);
  const [initialSubmitted, setInitialSubmitted] = useState(false);

  useEffect(() => {
    const preload = async () => {
      try {
        const res = await fetch(`${API_BASE}/student/profile`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) return;

        setInitialProfile(data.student);
        setInitialCanEdit(Boolean(data.canEdit));
        const wasSubmitted = Boolean(data.student?.registration_complete);
        setInitialSubmitted(wasSubmitted);

        if (wasSubmitted) {
          setStarted(true);
        }
      } finally {
        setInitialLoading(false);
      }
    };

    preload();
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  if (initialLoading) {
    return (
      <div className="campus-bg min-h-screen w-full flex items-center justify-center p-4" style={campusBgStyle}>
        <div className="glass-card w-full max-w-3xl rounded-2xl p-8 text-slate-900">Loading...</div>
      </div>
    );
  }

  return started ? (
    <BasicInfoForm
      onBack={() => setStarted(false)}
      initialProfile={initialProfile}
      initialCanEdit={initialCanEdit}
      initialSubmitted={initialSubmitted}
      studentName={initialProfile?.name}
      onLogout={handleLogout}
    />
  ) : (
    <WelcomeStep onStart={() => setStarted(true)} studentName={initialProfile?.name} onLogout={handleLogout} />
  );
}
