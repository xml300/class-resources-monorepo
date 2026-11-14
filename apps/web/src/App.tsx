import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DaysProvider } from "./context/DaysContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminDayResourcesPage } from "./pages/AdminDayResourcesPage";

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
              </Routes>
            </main>
          </div>
        </DaysProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
