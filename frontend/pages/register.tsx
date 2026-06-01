import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { Layout } from "../components/Layout";
import { registerUser } from "../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const name = `${firstName} ${lastName}`.trim();
      await registerUser({ name, email, password });
      router.push(`/login?email=${encodeURIComponent(email)}&registered=true`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showFooter={false}>
      <Head>
        <title>Register | Badminton Hub</title>
      </Head>
      <section className="section-padding min-h-screen bg-white">
        <div className="container-default grid place-items-center">
          <div className="w-full max-w-md space-y-6 rounded-3xl bg-background p-8 shadow-card ring-1 ring-black/5">
            <div className="space-y-2 text-center">
              <p className="pill inline-flex bg-primary/10 text-primary">Join Badminton Hub</p>
              <h1 className="font-heading text-3xl font-semibold">Create account</h1>
              <p className="text-sm text-secondary/70">
                Track orders, save sizes, and get personalized drops.
              </p>
            </div>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                required
                className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                required
                className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              
              {error && <p className="text-sm text-primary">{error}</p>}
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Creating..." : "Sign up"}
              </button>
            </form>
            <p className="text-center text-sm text-secondary/70">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
