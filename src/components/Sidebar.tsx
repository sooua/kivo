import { useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.svg";

const navItems = [
  { path: "/", icon: "translate" },
  { path: "/history", icon: "history" },
  { path: "/api-keys", icon: "vpn_key" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="fixed left-0 top-0 h-full w-20 bg-slate-100 shadow-[0_12px_40px_rgba(0,88,190,0.08)] flex flex-col items-center py-8 z-50">
      <div className="mb-12">
        <img src={logo} alt="Logo" className="w-10 h-10" />
      </div>
      <nav className="flex flex-col gap-8 flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                isActive
                  ? "text-blue-700 scale-110"
                  : "text-slate-500 opacity-60 hover:bg-slate-200"
              }`}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={
                  isActive
                    ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                    : undefined
                }
              >
                {item.icon}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
