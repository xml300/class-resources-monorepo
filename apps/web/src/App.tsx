import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DaysProvider } from "./context/DaysContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminDayResourcesPage } from "./pages/AdminDayResourcesPage";
import { AdminProjectsPage } from "./pages/AdminProjectsPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DaysProvider>
          <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/days/:id"
                  element={
                    <ProtectedRoute>
                      <AdminDayResourcesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/projects"
                  element={
                    <ProtectedRoute>
                      <AdminProjectsPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </div>
        </DaysProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
