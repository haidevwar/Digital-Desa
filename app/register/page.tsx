"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    namaLengkap: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "warga",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Password tidak cocok")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaLengkap: formData.namaLengkap,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/login?registered=true")
      } else {
        setError(data.error || "Registrasi gagal")
      }
    } catch (err) {
      setError("Terjadi kesalahan saat registrasi")
      console.error(err)
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
            <p className="text-text-secondary">Daftar Akun Baru</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-danger bg-opacity-10 border border-danger border-opacity-30 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="namaLengkap" className="block text-sm font-medium text-text mb-2">
                Nama Lengkap
              </label>
              <input
                type="text"
                id="namaLengkap"
                name="namaLengkap"
                value={formData.namaLengkap}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-2">
                Konfirmasi Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-text mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="warga">Warga</option>
                <option value="petugas">Petugas Desa</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Daftar"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-primary font-medium hover:text-primary-dark">
              Login di sini
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
