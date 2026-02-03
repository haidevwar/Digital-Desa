"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      console.log("[v0] Starting login with email:", email)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      })

      console.log("[v0] Login response status:", response.status)
      const data = await response.json()
      console.log("[v0] Login response data:", data)

      if (response.ok && data.success) {
        console.log("[v0] Login successful, token:", data.token ? "received" : "missing")
        if (data.token) {
          setToken(data.token)
          console.log("[v0] Token saved to localStorage")
          localStorage.setItem("user", JSON.stringify(data.user))
          console.log("[v0] User data saved, redirecting to dashboard")
        }

        // Redirect to dashboard
        setTimeout(() => {
          router.push("/app/dashboard")
        }, 500)
      } else {
        console.log("[v0] Login failed:", data.error)
        setError(data.error || "Login gagal")
      }
    } catch (err) {
      console.error("[v0] Login error:", err)
      setError("Terjadi kesalahan saat login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Digital Desa</h1>
            <p className="text-text-secondary">Sistem Manajemen Data Desa</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-danger bg-opacity-10 border border-danger border-opacity-30 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin@desa.id"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            Belum punya akun?{" "}
            <Link href="/register" className="text-primary font-medium hover:text-primary-dark">
              Daftar di sini
            </Link>
          </div>

          <div className="mt-8 p-4 bg-surface rounded-lg border border-border">
            <p className="text-xs text-text-secondary mb-2 font-medium">Demo Credentials:</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-text">Admin Account:</p>
                <p className="text-xs text-text-secondary">Email: admin@desa.id</p>
                <p className="text-xs text-text-secondary">Password: admin123</p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-text">Petugas Account:</p>
                <p className="text-xs text-text-secondary">Email: petugas@desa.id</p>
                <p className="text-xs text-text-secondary">Password: admin123</p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-text">Warga Account:</p>
                <p className="text-xs text-text-secondary">Email: warga@desa.id</p>
                <p className="text-xs text-text-secondary">Password: admin123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
