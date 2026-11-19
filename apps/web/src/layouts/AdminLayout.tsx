import { Outlet } from "react-router-dom";
import { AdminNavToggle } from "../components/AdminNavToggle";

export function AdminLayout() {
  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <div className="mb-5">
        <AdminNavToggle />
      </div>
      <Outlet />
    </div>
  );
}
