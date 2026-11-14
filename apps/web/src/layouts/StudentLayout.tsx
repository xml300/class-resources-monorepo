import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Outlet } from "react-router-dom";
import { PanelLeftOpen, X } from "lucide-react";
import { ContentToggle } from "../components/ContentToggle";

interface StudentLayoutContextValue {
  portalTarget: HTMLDivElement | null;
  closeSidebar: () => void;
}

const StudentLayoutContext = createContext<StudentLayoutContextValue>({
  portalTarget: null,
  closeSidebar: () => {},
});

export function useStudentSidebar() {
  return useContext(StudentLayoutContext);
}

export function StudentSidebar({
  icon,
  title,
  badge,
  children,
}: {
  icon?: ReactNode;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const { portalTarget, closeSidebar } = useStudentSidebar();
  if (!portalTarget) return null;

  return createPortal(
    <div>
      <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {badge}
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close contents sidebar"
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {children}
    </div>,
    portalTarget
  );
}

export function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <StudentLayoutContext.Provider value={{ portalTarget, closeSidebar }}>
      <div className="relative flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            onClick={closeSidebar}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Shared Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 overflow-y-auto border-r border-zinc-800/80 bg-zinc-950 p-4 transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 md:bg-zinc-900/40 lg:w-80 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div ref={setPortalTarget} className="md:sticky md:top-20" />
        </aside>

        {/* Shared Main Content */}
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 md:hidden"
              >
                <PanelLeftOpen className="h-4 w-4 text-emerald-400" />
                Contents
              </button>
              <ContentToggle />
            </div>

            <Outlet />
          </div>
        </div>
      </div>
    </StudentLayoutContext.Provider>
  );
}
