import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-primary">WordWise</h1>
          <p className="mt-2 text-sm text-muted-foreground">Learn Smarter, Speak Clearer</p>
        </div>

        <div className="rounded-xl bg-card p-8 shadow-sm border border-border">
          <h2 className="mb-6 text-xl font-bold text-heading">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="focus-visible:ring-primary" />
            </div>
            <Button type="submit" className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to WordWise?{" "}
            <Link to="/register" className="font-medium text-success hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
