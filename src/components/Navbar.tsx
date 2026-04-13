import { Link, useLocation } from "react-router-dom";
import { Flame, LogOut } from "lucide-react";
import { currentUser } from "@/data/mockData";

const navLinks = [
  { label: "Dashboard", path: "/" },
  { label: "Pronunciation", path: "/pronunciation" },
  { label: "Decomposer", path: "/decomposer" },
  { label: "News", path: "/news" },
  { label: "Word of Day", path: "/word-of-day" },
  { label: "Quiz", path: "/quiz" },
  { label: "Categories", path: "/categories" },
  { label: "Progress", path: "/progress" },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-primary">WordWise</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
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
            <span className="text-sm font-bold text-gold">{currentUser.streak}</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {currentUser.avatar}
          </div>
          <Link to="/login" className="text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
