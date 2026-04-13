import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, token } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (token) { navigate("/", { replace: true }); return null; }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.password) errs.password = "Password is required";
    if (form.password.length > 0 && form.password.length < 6) errs.password = "Password must be at least 6 characters";
    if (form.password !== form.confirm) errs.confirm = "Passwords do not match";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      if (errs.confirm) toast.error("Passwords do not match");
      return;
    }
    const err = register(form.name.trim(), form.email.trim(), form.password);
    if (err) { setErrors({ email: err }); toast.error(err); return; }
    toast.success("Account created successfully!");
    navigate("/");
  };

  const field = (id: string, label: string, type = "text", placeholder = "") => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} placeholder={placeholder} value={(form as any)[id]} onChange={(e) => setForm({ ...form, [id]: e.target.value })} className="focus-visible:ring-primary" />
      {errors[id] && <p className="text-xs text-destructive">{errors[id]}</p>}
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-primary">WordWise</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create your account</p>
        </div>
        <div className="rounded-xl bg-card p-8 shadow-sm border border-border">
          <h2 className="mb-6 text-xl font-bold text-heading">Register</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {field("name", "Full Name", "text", "Alex Johnson")}
            {field("email", "Email", "email", "you@example.com")}
            {field("password", "Password", "password", "••••••••")}
            {field("confirm", "Confirm Password", "password", "••••••••")}
            <Button type="submit" className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">Create Account</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
