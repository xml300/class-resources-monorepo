import { Outlet } from "react-router-dom";
import { AdminNavToggle } from "../components/AdminNavToggle";

export function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-5">
        <AdminNavToggle />
      </div>
      <Outlet />
    </div>
  );
}
