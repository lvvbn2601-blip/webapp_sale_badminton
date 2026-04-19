import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { loginUser } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const prefill = router.query.email;
    if (typeof prefill === "string") setEmail(prefill);
    if (router.query.registered === "true") setIsRegistered(true);
  }, [router.isReady, router.query.email, router.query.registered]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await loginUser({ email, password });
      localStorage.setItem("accessToken", res.accessToken);
      localStorage.setItem("refreshToken", res.refreshToken);
      localStorage.setItem("user", JSON.stringify(res.user));
      // Notify CartContext (and Navbar) that the user just logged in
      window.dispatchEvent(new Event("auth:user-updated"));
      const next = typeof router.query.next === "string" ? router.query.next : "/";
      router.push(next);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showFooter={false}>
      <Head>
        <title>Login | Badminton Hub</title>
      </Head>
      <section className="section-padding min-h-screen bg-white">
        <div className="container-default grid place-items-center">
          <div className="w-full max-w-md space-y-6 rounded-3xl bg-background p-8 shadow-card ring-1 ring-black/5">
            <div className="space-y-2 text-center">
              <p className="pill inline-flex bg-primary/10 text-primary">Welcome back</p>
              <h1 className="font-heading text-3xl font-semibold">Sign in</h1>
              <p className="text-sm text-secondary/70">Access your orders, wishlist, and rewards.</p>
            </div>
            <form className="space-y-4" onSubmit={onSubmit}>
              {isRegistered && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center text-sm text-emerald-700">
                  <span className="font-semibold block mb-1">Account created successfully!</span>
                  Please sign in with your new credentials below.
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-secondary">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  type="email"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-secondary">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              {error && <p className="text-sm text-primary">{error}</p>}
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
            <p className="text-center text-sm text-secondary/70">
              New here?{" "}
              <Link href="/register" className="font-semibold text-primary">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
