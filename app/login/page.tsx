"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  saveAuthLocal, 
  getAuthLocal, 
  isTokenValid,
  type LocalAuthData 
} from "@/lib/local-db"

// Simple hash function for offline password verification
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isOnline, setIsOnline] = useState(true)
  const [offlineLoginAvailable, setOfflineLoginAvailable] = useState(false)
  const router = useRouter()

  // Check online status and cached credentials
  useEffect(() => {
    const checkStatus = async () => {
      setIsOnline(navigator.onLine)
      
      // Check if we have valid cached credentials
      const tokenValid = await isTokenValid()
      const cachedAuth = await getAuthLocal()
      setOfflineLoginAvailable(tokenValid && !!cachedAuth?.passwordHash)
    }
    
    checkStatus()
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Auto-redirect if already logged in with valid token
  useEffect(() => {
    const checkExistingSession = async () => {
      const tokenValid = await isTokenValid()
      if (tokenValid) {
        router.push("/app/dashboard")
      }
    }
    checkExistingSession()
  }, [router])

  const handleOnlineLogin = async () => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    })

    const data = await response.json()

    if (response.ok && data.success) {
      // Hash password for offline verification
      const passwordHash = await hashPassword(password)
      
      // Calculate token expiry (7 days from now)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      // Save auth data to IndexedDB for offline use
      const authData: LocalAuthData = {
        id: "current_user",
        token: data.token || "",
        user: data.user,
        loginTime: new Date().toISOString(),
        expiresAt,
        passwordHash,
      }
      
      await saveAuthLocal(authData)
      localStorage.setItem("user", JSON.stringify(data.user))
      
      return { success: true }
    } else {
      return { success: false, error: data.error || "Login gagal" }
    }
  }

  const handleOfflineLogin = async () => {
    const cachedAuth = await getAuthLocal()
    
    if (!cachedAuth) {
      return { success: false, error: "Tidak ada data login tersimpan. Silakan login online terlebih dahulu." }
    }
    
    // Verify email matches
    if (cachedAuth.user.email !== email) {
      return { success: false, error: "Email tidak cocok dengan akun tersimpan" }
    }
    
    // Verify password hash
    const inputHash = await hashPassword(password)
    if (inputHash !== cachedAuth.passwordHash) {
      return { success: false, error: "Password salah" }
    }
    
    // Check if token is still valid
    const tokenValid = await isTokenValid()
    if (!tokenValid) {
      return { success: false, error: "Sesi telah kedaluwarsa. Silakan login online." }
    }
    
    // Update login time
    await saveAuthLocal({
      ...cachedAuth,
      loginTime: new Date().toISOString(),
    })
    
    localStorage.setItem("user", JSON.stringify(cachedAuth.user))
    
    return { success: true }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      let result: { success: boolean; error?: string }
      
      if (isOnline) {
        result = await handleOnlineLogin()
      } else {
        result = await handleOfflineLogin()
      }
      
      if (result.success) {
        router.push("/app/dashboard")
      } else {
        setError(result.error || "Login gagal")
      }
    } catch (err) {
      console.error("Login error:", err)
      
      // If online login fails due to network, try offline
      if (isOnline && offlineLoginAvailable) {
        try {
          const offlineResult = await handleOfflineLogin()
          if (offlineResult.success) {
            setError("")
            router.push("/app/dashboard")
            return
          }
        } catch {
          // Ignore offline fallback errors
        }
      }
      
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
            
            {/* Online/Offline Status Indicator */}
            <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isOnline 
                ? "bg-green-100 text-green-700" 
                : "bg-yellow-100 text-yellow-700"
            }`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-yellow-500"}`} />
              {isOnline ? "Online" : "Offline Mode"}
            </div>
            
            {!isOnline && offlineLoginAvailable && (
              <p className="mt-2 text-xs text-green-600">
                Login offline tersedia dengan kredensial tersimpan
              </p>
            )}
            
            {!isOnline && !offlineLoginAvailable && (
              <p className="mt-2 text-xs text-yellow-600">
                Tidak ada sesi tersimpan. Silakan hubungkan ke internet.
              </p>
            )}
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
