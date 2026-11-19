import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Outlet } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { ContentToggle } from "../components/ContentToggle";

const SIDEBAR_COLLAPSED_KEY = "student-sidebar-collapsed";

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

interface StudentLayoutContextValue {
  portalTarget: HTMLDivElement | null;
  closeSidebar: () => void;
  collapseDesktopSidebar: () => void;
}

const StudentLayoutContext = createContext<StudentLayoutContextValue>({
  portalTarget: null,
  closeSidebar: () => {},
  collapseDesktopSidebar: () => {},
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
  const { portalTarget, closeSidebar, collapseDesktopSidebar } =
    useStudentSidebar();
  if (!portalTarget) return null;

  return createPortal(
    <div>
      <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <h2 className="truncate text-xs font-semibold tracking-wider text-zinc-300 uppercase">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {badge}
          <button
            type="button"
            onClick={collapseDesktopSidebar}
            title="Collapse sidebar"
            aria-label="Collapse contents sidebar"
            className="hidden rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 lg:inline-flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close contents sidebar"
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 lg:hidden"
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
  const [desktopCollapsed, setDesktopCollapsed] = useState(getInitialCollapsed);
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const setCollapsedPersisted = useCallback((collapsed: boolean) => {
    setDesktopCollapsed(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // ignore storage errors
    }
  }, []);

  const collapseDesktopSidebar = useCallback(
    () => setCollapsedPersisted(true),
    [setCollapsedPersisted]
  );

  return (
    <StudentLayoutContext.Provider
      value={{ portalTarget, closeSidebar, collapseDesktopSidebar }}
    >
      <div className="relative flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
        {/* Mobile / Tablet Backdrop */}
        {sidebarOpen && (
          <div
            onClick={closeSidebar}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Shared Left Sidebar */}
        <aside
          aria-hidden={desktopCollapsed ? undefined : false}
          className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 overflow-y-auto border-r border-zinc-800/80 bg-zinc-950 p-4 transition-all duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 lg:bg-zinc-900/40 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${
            desktopCollapsed
              ? "lg:w-0 lg:overflow-hidden lg:border-r-0 lg:p-0 lg:opacity-0"
              : "lg:w-72 xl:w-80 lg:opacity-100"
          }`}
        >
          <div
            ref={setPortalTarget}
            className={`lg:sticky lg:top-20 ${
              desktopCollapsed ? "lg:pointer-events-none lg:invisible" : ""
            }`}
          />
        </aside>

        {/* Shared Fluid Main Content */}
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 lg:hidden"
                >
                  <PanelLeftOpen className="h-4 w-4 text-emerald-400" />
                  Contents
                </button>

                {desktopCollapsed && (
                  <button
                    type="button"
                    onClick={() => setCollapsedPersisted(false)}
                    title="Expand sidebar"
                    className="hidden items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-700/70 hover:bg-zinc-800 hover:text-emerald-300 lg:inline-flex"
                  >
                    <PanelLeftOpen className="h-4 w-4 text-emerald-400" />
                    Contents
                  </button>
                )}

                <ContentToggle />
              </div>
            </div>

            <Outlet />
          </div>
        </div>
      </div>
    </StudentLayoutContext.Provider>
  );
}
