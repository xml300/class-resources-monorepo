import { Link, useLocation } from "react-router-dom";
import { useDays } from "../context/DaysContext";

export function ContentToggle() {
  const location = useLocation();
  const { activeDay } = useDays();
  const isProjects = location.pathname.startsWith("/projects");
  const dailyHref = activeDay ? `/?day=${activeDay.dayNumber}` : "/";

  return (
    <nav
      aria-label="Primary navigation"
      className="inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 text-xs font-medium"
    >
      <Link
        to={dailyHref}
        className={`rounded-lg px-3.5 py-1.5 transition ${
          !isProjects
            ? "bg-zinc-800 text-zinc-100 shadow-xs"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Daily Materials
      </Link>
      <Link
        to="/projects"
        className={`rounded-lg px-3.5 py-1.5 transition ${
          isProjects
            ? "bg-emerald-800 text-emerald-50 shadow-xs"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Mini Projects
      </Link>
    </nav>
  );
}
