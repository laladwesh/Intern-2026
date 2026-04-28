import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE, saveSession, getToken, getRole } from "../utils/auth";
import iitgBg from "../assets/iitg_bg.png";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 1) Handle token returned in URL after OAuth callback
    const query = new URLSearchParams(location.search);
    const tokenFromUrl = query.get("token");
    const roleFromUrl = query.get("role");
    const errorFromUrl = query.get("error");

    if (errorFromUrl) {
      setError(errorFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (tokenFromUrl && roleFromUrl) {
      saveSession(tokenFromUrl, roleFromUrl);
      // Clear token from URL without re-triggering effect
      window.history.replaceState({}, document.title, window.location.pathname);

      if (roleFromUrl === "admin") {
        navigate("/coordinator", { replace: true });
      } else if (roleFromUrl === "student") {
        navigate("/student/landing", { replace: true });
      }
      return;
    }

    // 2) Already has a token in localStorage — verify it and redirect
    const token = getToken();
    const role = getRole();
    if (!token || !role) return;

    const verifySession = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.role === "admin") navigate("/coordinator", { replace: true });
          else if (data.role === "student") navigate("/student/landing", { replace: true });
        }
      } catch {
        // token invalid — stay on login
      }
    };

    verifySession();
  }, [location.search, navigate]);

  const handleOutlookLogin = () => {
    setError("");
    setLoading(true);
    window.location.href = `${API_BASE}/auth/outlook/login`;
  };

  return (
    <div
      className="iitg-login-bg min-h-screen w-full flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundImage: `url(${iitgBg})` }}
    >
      <div className="iitg-role-card w-full max-w-[92vw] sm:max-w-md md:max-w-lg rounded-sm p-5 sm:p-7 md:p-8 text-slate-900">
        <div className="flex justify-center mb-3 sm:mb-4">
          <img
            src={`${process.env.PUBLIC_URL}/iitg.png`}
            alt="IITG"
            className="h-16 w-16 sm:h-24 sm:w-24 md:h-28 md:w-28 object-contain"
          />
        </div>

        <h1 className="text-xl sm:text-2xl leading-tight font-semibold tracking-tight text-slate-900 text-center sm:text-left">
          Select a role
        </h1>

        <div className="mt-5 sm:mt-8 space-y-3 sm:space-y-4">
          <label className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl leading-none text-slate-800 cursor-pointer">
            <input type="radio" name="role" checked readOnly className="h-5 w-5" />
            <span>Student</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-4 sm:pt-6 flex justify-stretch sm:justify-end">
            <button
              type="button"
              onClick={handleOutlookLogin}
              disabled={loading}
              className="w-full sm:w-auto rounded-sm bg-[var(--brand)] px-6 sm:px-8 py-2 text-white text-sm sm:text-base font-semibold disabled:opacity-60"
            >
              {loading ? "Redirecting..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
