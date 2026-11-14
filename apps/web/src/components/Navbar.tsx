import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useDays } from "../context/DaysContext";

export function Navbar() {
  const { authenticated, email, logout } = useAuth();
  const { days, activeDay, setActiveDayNumber } = useDays();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith("/admin");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const activeIndex = activeDay
    ? days.findIndex((d) => d.id === activeDay.id)
    : -1;
  const prevDay = activeIndex > 0 ? days[activeIndex - 1] : null;
  const nextDay =
    activeIndex >= 0 && activeIndex < days.length - 1
      ? days[activeIndex + 1]
      : null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-800/90 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 font-semibold text-zinc-100 transition hover:text-emerald-400"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-700/60 bg-emerald-900 text-emerald-100">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base tracking-tight">Class Resources</span>
              <span className="hidden text-xs font-normal text-zinc-400 sm:block">
                Daily Course Materials
              </span>
            </div>
          </Link>

          {/* Top-right narrow day-based navigation on daily materials view */}
          {!isAdminRoute &&
            location.pathname === "/" &&
            days.length > 0 &&
            activeDay && (
              <nav
                aria-label="Day navigation"
                className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1"
              >
                <button
                  type="button"
                  disabled={!prevDay}
                  onClick={() =>
                    prevDay && setActiveDayNumber(prevDay.dayNumber)
                  }
                  title={prevDay ? `Day ${prevDay.dayNumber}` : "First day"}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="relative flex items-center">
                  <select
                    aria-label="Select class day"
                    value={activeDay.dayNumber}
                    onChange={(e) => setActiveDayNumber(Number(e.target.value))}
                    className="cursor-pointer appearance-none rounded-lg bg-emerald-800 px-3 py-1 text-center text-xs font-medium text-emerald-50 shadow-xs transition hover:bg-emerald-700 focus:outline-none"
                  >
                    {days.map((day) => (
                      <option
                        key={day.id}
                        value={day.dayNumber}
                        className="bg-zinc-900 text-zinc-100"
                      >
                        Day {day.dayNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!nextDay}
                  onClick={() =>
                    nextDay && setActiveDayNumber(nextDay.dayNumber)
                  }
                  title={nextDay ? `Day ${nextDay.dayNumber}` : "Last day"}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            )}

          {/* Admin route controls only */}
          {isAdminRoute && (
            <nav className="flex items-center gap-2">
              {authenticated && (
                <>
                  <Link
                    to="/admin"
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      location.pathname === "/admin" ||
                      location.pathname.startsWith("/admin/days")
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                    }`}
                  >
                    Days
                  </Link>
                  <Link
                    to="/admin/projects"
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      location.pathname.startsWith("/admin/projects")
                        ? "bg-emerald-900/80 text-emerald-100"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                    }`}
                  >
                    Mini Projects
                  </Link>
                </>
              )}
              <Link
                to="/"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100"
              >
                Student View
              </Link>
              {authenticated && (
                <>
                  <span className="hidden text-xs text-zinc-400 md:inline">
                    {email}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Content & Mini Projects toggle under the header */}
      {!isAdminRoute && (
        <div className="border-b border-zinc-800/70 bg-zinc-950/70">
          <div className="mx-auto flex max-w-6xl items-center px-4 py-2.5 sm:px-6">
            <nav
              aria-label="Primary navigation"
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 text-xs font-medium"
            >
              <Link
                to="/"
                className={`rounded-lg px-3.5 py-1.5 transition ${
                  location.pathname === "/"
                    ? "bg-zinc-800 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Daily Materials
              </Link>
              <Link
                to="/projects"
                className={`rounded-lg px-3.5 py-1.5 transition ${
                  location.pathname.startsWith("/projects")
                    ? "bg-emerald-800 text-emerald-50 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Mini Projects
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
