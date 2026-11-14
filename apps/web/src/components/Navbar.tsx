import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { authenticated, email, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith("/admin");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-semibold text-slate-900 hover:text-indigo-600"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base tracking-tight">Class Resources</span>
            <span className="hidden text-xs font-normal text-slate-500 sm:block">
              Daily Course Materials &amp; Syllabus
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {isAdminRoute ? (
            <Link
              to="/"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Student View
            </Link>
          ) : null}

          {authenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Link>
              <span className="hidden text-xs text-slate-500 md:inline">
                {email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
