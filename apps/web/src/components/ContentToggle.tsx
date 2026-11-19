import { Link, useLocation } from "react-router-dom";
import { useDays } from "../context/DaysContext";

export function ContentToggle() {
  const location = useLocation();
  const { activeDay } = useDays();
  const isExercises = location.pathname.startsWith("/exercises");
  const isCode = location.pathname.startsWith("/code");
  const isProjects = location.pathname.startsWith("/projects");
  const isDaily = !isExercises && !isCode && !isProjects;
  const dayQuery = activeDay ? `?day=${activeDay.dayNumber}` : "";

  return (
    <nav
      aria-label="Primary navigation"
      className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 text-xs font-medium"
    >
      <Link
        to={`/${dayQuery}`}
        className={`rounded-lg px-3 py-1.5 transition ${
          isDaily
            ? "bg-zinc-800 text-zinc-100 shadow-xs"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Daily Materials
      </Link>
      <Link
        to={`/exercises${dayQuery}`}
        className={`rounded-lg px-3 py-1.5 transition ${
          isExercises
            ? "bg-emerald-800 text-emerald-50 shadow-xs"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Exercises
      </Link>
      <Link
        to={`/code${dayQuery}`}
        className={`rounded-lg px-3 py-1.5 transition ${
          isCode
            ? "bg-emerald-800 text-emerald-50 shadow-xs"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Code
      </Link>
      <Link
        to={`/projects${dayQuery}`}
        className={`rounded-lg px-3 py-1.5 transition ${
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
