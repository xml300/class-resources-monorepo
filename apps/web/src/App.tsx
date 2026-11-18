import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DaysProvider } from "./context/DaysContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { StudentLayout } from "./layouts/StudentLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { HomePage } from "./pages/HomePage";

const ExercisesPage = lazy(() =>
  import("./pages/ExercisesPage").then((m) => ({ default: m.ExercisesPage }))
);
const ExerciseDetailPage = lazy(() =>
  import("./pages/ExerciseDetailPage").then((m) => ({
    default: m.ExerciseDetailPage,
  }))
);
const CodePage = lazy(() =>
  import("./pages/CodePage").then((m) => ({ default: m.CodePage }))
);
const CodeDetailPage = lazy(() =>
  import("./pages/CodeDetailPage").then((m) => ({
    default: m.CodeDetailPage,
  }))
);
const ProjectsPage = lazy(() =>
  import("./pages/ProjectsPage").then((m) => ({ default: m.ProjectsPage }))
);
const ProjectDetailPage = lazy(() =>
  import("./pages/ProjectDetailPage").then((m) => ({
    default: m.ProjectDetailPage,
  }))
);
const AdminLoginPage = lazy(() =>
  import("./pages/AdminLoginPage").then((m) => ({ default: m.AdminLoginPage }))
);
const AdminDashboardPage = lazy(() =>
  import("./pages/AdminDashboardPage").then((m) => ({
    default: m.AdminDashboardPage,
  }))
);
const AdminDayResourcesPage = lazy(() =>
  import("./pages/AdminDayResourcesPage").then((m) => ({
    default: m.AdminDayResourcesPage,
  }))
);
const AdminProjectsPage = lazy(() =>
  import("./pages/AdminProjectsPage").then((m) => ({
    default: m.AdminProjectsPage,
  }))
);

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DaysProvider>
          <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <Navbar />
            <main>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route element={<StudentLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/exercises" element={<ExercisesPage />} />
                    <Route
                      path="/exercises/:id"
                      element={<ExerciseDetailPage />}
                    />
                    <Route path="/code" element={<CodePage />} />
                    <Route path="/code/:id" element={<CodeDetailPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route
                      path="/projects/:id"
                      element={<ProjectDetailPage />}
                    />
                  </Route>

                  <Route path="/admin/login" element={<AdminLoginPage />} />

                  <Route
                    element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route
                      path="/admin/days/:id"
                      element={<AdminDayResourcesPage />}
                    />
                    <Route
                      path="/admin/projects"
                      element={<AdminProjectsPage />}
                    />
                  </Route>
                </Routes>
              </Suspense>
            </main>
          </div>
        </DaysProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
