import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to your CreatorHub account.</p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-brand-600">
          Create an account
        </Link>
      </p>
    </div>
  );
}
