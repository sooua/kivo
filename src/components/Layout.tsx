import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="overflow-hidden h-screen">
      <Sidebar />
      <main className="ml-20 h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
