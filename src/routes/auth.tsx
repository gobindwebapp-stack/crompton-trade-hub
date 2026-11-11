import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck, Store, Truck, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { cleanText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().catch(undefined),
  redirect: z.string().max(300).optional().catch(undefined),
});

function safePath(p?: string) {
  if (!p || !p.startsWith("/") || p.startsWith("//")) return "/";
  return p;
}

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or register — Crompton Trade Hub" },
      { name: "description", content: "Create a dealer or retailer account to order at trade prices." },
      { property: "og:title", content: "Join Crompton Trade Hub" },
      { property: "og:description", content: "Register as a dealer or retailer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  full_name: z.string().min(2, "Enter your name").max(120),
  business_name: z.string().min(2, "Enter your business name").max(160),
  phone: z.string().regex(/^[0-9+ -]{7,20}$/, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

type RoleChoice = "dealer" | "retailer" | "admin";

function AuthPage() {
  const { mode: initialMode, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [role, setRole] = useState<RoleChoice>("dealer");
  const [form, setForm] = useState({ full_name: "", business_name: "", phone: "", email: "", password: "" });
  const target = safePath(redirect);

  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data, error }) => setAdminExists(error ? true : Boolean(data)));
  }, []);

  useEffect(() => {
    if (ready && user) navigate({ to: target });
  }, [ready, user, target, navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = {
      full_name: cleanText(form.full_name, 120),
      business_name: cleanText(form.business_name, 160),
      phone: cleanText(form.phone, 20),
      email: form.email.trim(),
      password: form.password,
    };
    const parsed = signUpSchema.safeParse(cleaned);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}${target}`,
        data: {
          full_name: parsed.data.full_name,
          business_name: parsed.data.business_name,
          phone: parsed.data.phone,
          requested_role: role === "admin" && adminExists ? "retailer" : role,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) setSentTo(parsed.data.email);
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Google sign-in failed. Please try again.");
  }

  const roles: { id: RoleChoice; title: string; text: string; icon: typeof Store }[] = [
    { id: "dealer", title: "Dealer", text: "Wholesale prices, carton MOQs", icon: Truck },
    { id: "retailer", title: "Retailer", text: "Retail prices, small quantities", icon: Store },
    ...(adminExists === false
      ? [{ id: "admin" as const, title: "Admin", text: "Manage store (first account only)", icon: ShieldCheck }]
      : []),
  ];

  if (sentTo) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <MailCheck className="h-12 w-12 text-wholesale" />
        <h1 className="text-xl font-extrabold">Confirm your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a link to <strong className="text-foreground">{sentTo}</strong>. Open it to activate your account, then
          you'll come straight back to checkout.
        </p>
        <Button variant="outline" onClick={() => { setSentTo(null); setMode("signin"); }}>Back to sign in</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-3 py-6">
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="grid grid-cols-2 border-b text-sm font-bold">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn("py-3", mode === m ? "border-b-2 border-primary text-primary" : "text-muted-foreground")}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-5">
          {redirect?.startsWith("/checkout") && (
            <p className="rounded-md bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              Sign in or create an account to place your order. Your cart is saved.
            </p>
          )}

          <Button type="button" variant="outline" className="w-full" onClick={() => void onGoogle()}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="!size-[18px]"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
            Continue with Google
          </Button>
          {mode === "signup" && (
            <p className="-mt-2 text-center text-[11px] text-muted-foreground">Google accounts start as Retailer; an admin can upgrade you.</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
          </div>

          {mode === "signin" ? (
            <form onSubmit={onSignIn} className="space-y-3">
              <Field label="Email"><Input type="email" autoComplete="email" required value={form.email} onChange={set("email")} /></Field>
              <Field label="Password"><Input type="password" autoComplete="current-password" required value={form.password} onChange={set("password")} /></Field>
              <Button type="submit" variant="cta" size="lg" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} Sign in
              </Button>
            </form>
          ) : (
            <form onSubmit={onSignUp} className="space-y-3">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold">I am a</Label>
                <div className={cn("grid gap-2", roles.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                  {roles.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left",
                        role === r.id ? "border-primary bg-secondary ring-1 ring-primary" : "hover:border-primary",
                      )}
                    >
                      <r.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold">{r.title}</span>
                      <span className="text-[10px] leading-tight text-muted-foreground">{r.text}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Full name"><Input autoComplete="name" required maxLength={120} value={form.full_name} onChange={set("full_name")} /></Field>
              <Field label="Business name"><Input autoComplete="organization" required maxLength={160} value={form.business_name} onChange={set("business_name")} /></Field>
              <Field label="Phone"><Input type="tel" autoComplete="tel" required maxLength={20} value={form.phone} onChange={set("phone")} /></Field>
              <Field label="Email"><Input type="email" autoComplete="email" required maxLength={255} value={form.email} onChange={set("email")} /></Field>
              <Field label="Password"><Input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={form.password} onChange={set("password")} /></Field>
              <Button type="submit" variant="cta" size="lg" className="w-full" disabled={busy || adminExists === null}>
                {busy && <Loader2 className="animate-spin" />} Create {role} account
              </Button>
            </form>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Just browsing? <Link to="/products" className="font-semibold text-primary">Keep shopping</Link> — no account needed.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}
