import { Link, useLocation, useNavigate } from "react-router-dom";
import { Flame, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const navLinks = [
  { label: "Dashboard", path: "/" },
  { label: "Pronunciation", path: "/pronunciation" },
  { label: "Decomposer", path: "/decomposer" },
  { label: "News", path: "/news" },
  { label: "Word of Day", path: "/word-of-day" },
  { label: "Quiz", path: "/quiz" },
  { label: "Categories", path: "/categories" },
  { label: "Word Bank", path: "/word-bank" },
  { label: "Progress", path: "/progress" },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-primary">WordWise</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === l.path
                  ? "text-primary border-b-2 border-primary"
                  : "text-body hover:text-primary"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1">
            <Flame className="h-4 w-4 text-gold" />
            <span className="text-sm font-bold text-gold">{user?.currentStreak ?? 0}</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {user?.avatar ?? "?"}
          </div>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-muted-foreground">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card lg:hidden fade-in">
          <div className="container flex flex-col py-2">
            {navLinks.map((l) => (
              <Link
                key={l.path}
                to={l.path}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname === l.path
                    ? "text-primary bg-primary/5"
                    : "text-body hover:text-primary"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
