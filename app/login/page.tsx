"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site";
import { ProFooter } from "@/components/marketing";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function tryLogin(signal: AbortSignal) {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal,
    });
    return (await r.json()) as { ok: boolean; error?: string; transient?: boolean; is_admin?: boolean; needsActivation?: boolean };
  }

  function goNext(j: { is_admin?: boolean; needsActivation?: boolean }) {
    if (j.is_admin) { router.push("/admin"); return; }
    router.push(j.needsActivation ? "/activate" : "/dash");
  }

  // After a successful login, confirm the session cookie actually stuck
  // before leaving the page. If the browser blocks cookies (incognito /
  // privacy mode), pushing would just bounce back to /login looking broken.
  async function confirmSession(): Promise<boolean> {
    // Mobile networks can hang: hard timeout per attempt so login NEVER
    // sticks on "please wait". On timeout we proceed optimistically —
    // the layout re-verifies server-side and bounces only if truly logged out.
    for (let i = 0; i < 2; i++) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch("/api/me", { signal: ctrl.signal });
        clearTimeout(t);
        if (r.ok) return true;
        if (r.status === 401) return false;
      } catch { /* timeout/network — retry once, then proceed anyway */ }
      clearTimeout(t);
      await new Promise((res) => setTimeout(res, 1000));
    }
    return true;
  }

  async function handleSignIn() {
    if (!email || !password) {
      setError("Please enter both email/mobile and password.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      // Attempt 1 (may wake a cold server — can take 10–20s first time)
      const ctrl1 = new AbortController();
      const t1 = setTimeout(() => ctrl1.abort(), 45000);
      try {
        const j = await tryLogin(ctrl1.signal);
        clearTimeout(t1);
        if (!j.ok && !j.transient) {
          setError(j.error || "Login failed. Please try again.");
          return;
        }
        if (!j.ok) {
          // Transient hiccup (cold server) — fall through to attempt 2 automatically.
          setError("Server hiccup. Retrying automatically...");
        } else {
        setError("Login ok — confirming session, please wait...");
        if (!(await confirmSession())) {
          setError("Login succeeded but the session did not save in this browser. Please enable cookies (turn off incognito / private mode) and try again.");
          return;
        }
        setError("");
        goNext(j);
        return;
        }
      } catch (e) {
        clearTimeout(t1);
        if ((e as Error).name !== "AbortError") throw e;
        // Timed out — server was likely cold. One automatic retry on the now-warm server.
        setError("Server taking too long — retrying automatically, please wait...");
      }
      // Attempt 2 (server should be warm now)
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 45000);
      try {
        const j = await tryLogin(ctrl2.signal);
        clearTimeout(t2);
        if (!j.ok) {
          setError(j.error || "Login failed. Please try again.");
          return;
        }
        setError("Login ok — confirming session, please wait...");
        if (!(await confirmSession())) {
          setError("Login succeeded but the session did not save in this browser. Please enable cookies (turn off incognito / private mode) and try again.");
          return;
        }
        setError("");
        goNext(j);
      } catch {
        clearTimeout(t2);
        setError("Network is too slow right now. Please check your connection and try again.");
      }
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="relative flex flex-1 flex-col overflow-x-clip bg-[#060b16] px-4 py-8">
        <div className="m-auto flex w-full max-w-sm flex-col items-center">
          <div className="flex w-full flex-col items-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent p-8 shadow-2xl backdrop-blur-md">
            {/* logo */}
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-lg">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            </div>
            <h2 className="mb-1 text-center text-2xl font-black text-white">AVIATOR SMART AI</h2>
            <p className="mb-6 text-center text-sm text-slate-400">Log in to your account</p>

            {/* form */}
            <div className="flex w-full flex-col gap-4">
              <div className="flex w-full flex-col gap-3">
                <input
                  placeholder="Email or Mobile"
                  type="text"
                  value={email}
                  className="w-full rounded-xl bg-white/10 px-5 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/70"
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="relative">
                  <input
                    placeholder="Password"
                    type={show ? "text" : "password"}
                    value={password}
                    className="w-full rounded-xl bg-white/10 px-5 py-3 pr-16 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/70"
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSignIn(); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-yellow-300"
                  >
                    {show ? "HIDE" : "SHOW"}
                  </button>
                </div>
                {error && <div className="text-left text-sm font-bold text-red-400">{error}</div>}
              </div>
              <hr className="opacity-10" />
              <div>
                <button
                  onClick={handleSignIn}
                  disabled={busy}
                  className="mb-3 w-full rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black shadow transition hover:brightness-110 disabled:opacity-60"
                >
                  {busy ? "Logging in..." : "Log in"}
                </button>
                <div className="flex items-center justify-between text-xs">
                  <Link href="/forgot" className="text-gray-400 hover:text-yellow-300">
                    Forgot password?
                  </Link>
                </div>
                <div className="mt-3 w-full text-center">
                  <span className="text-xs text-gray-400">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="font-bold text-yellow-300 underline hover:text-yellow-200">
                      Sign up, it&apos;s free!
                    </Link>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* social proof */}
          <div className="mt-8 flex flex-col items-center text-center">
            <p className="mb-3 text-sm text-gray-400">
              Join <span className="font-bold text-white">thousands</span> of members already flying with Aviator Smart AI.
            </p>
            <div className="flex">
              {["R", "P", "A", "V"].map((c, i) => (
                <span
                  key={i}
                  className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#060b16] bg-gradient-to-br from-red-500 to-yellow-500 text-xs font-black text-white first:ml-0"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ProFooter />
    </div>
  );
}
