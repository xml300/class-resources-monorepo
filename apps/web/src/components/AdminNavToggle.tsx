import { Link, useLocation } from "react-router-dom";

export function AdminNavToggle() {
  const location = useLocation();
  const isProjects = location.pathname.startsWith("/admin/projects");
  const isPrs = location.pathname.startsWith("/admin/prs");
  const isDays = !isProjects && !isPrs;

  return (
    <nav
      aria-label="Admin section navigation"
      className="inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 text-xs font-medium"
    >
      <Link
        to="/admin"
        className={`rounded-lg px-3.5 py-1.5 transition ${
          isDays
            ? "bg-zinc-800 text-zinc-100 shadow-xs"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Days
      </Link>
      <Link
        to="/admin/projects"
        className={`rounded-lg px-3.5 py-1.5 transition ${
          isProjects
            ? "bg-emerald-800 text-emerald-50 shadow-xs"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Mini Projects
      </Link>
      <Link
        to="/admin/prs"
        className={`rounded-lg px-3.5 py-1.5 transition ${
          isPrs
            ? "bg-emerald-800 text-emerald-50 shadow-xs"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Pull Requests
      </Link>
    </nav>
  );
}
