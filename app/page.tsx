"use client";
export const dynamic = 'force-dynamic';

import { useState, useTransition, useEffect } from "react";
import MapView from "@/components/MapView";
import { login, logout, checkAuth, getCurrentUser, initDatabase } from "./actions/auth";
import { useRouter } from "next/navigation";

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isLocked, setIsLocked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        const authenticated = await checkAuth();

        if (authenticated) {
          const user = await getCurrentUser();
          if (user?.must_change_password) {
            router.push("/change-password");
            return;
          }
        }

        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false); // Fallback to login on error
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || isPending) return;

    setError("");

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    startTransition(async () => {
      const result = await login(formData);

      if (result.success) {
        if (result.mustChangePassword) {
          router.push("/change-password");
        } else {
          setIsAuthenticated(true);
          setEmail("");
          setPassword("");
        }
      } else {
        setError(result.error || "Błąd logowania");
        setAttemptsLeft(result.attemptsLeft || 0);
        setIsLocked(result.locked || false);
        setPassword("");
      }
    });
  };

  const handleLogout = async () => {
    startTransition(async () => {
      await logout();
      setIsAuthenticated(false);
    });
  };

  if (isLoading) {
    return (
      <div
        className="w-full h-[calc(100dvh-57px)] flex items-center justify-center"
        style={{ backgroundColor: "#1f2937" }}
      >
        <div className="text-gray-400">Ładowanie...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="w-full h-[calc(100dvh-57px)] flex items-center justify-center"
        style={{ backgroundColor: "#1f2937" }}
      >
        <div className="w-full max-w-md px-6">
          <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Wymagane uwierzytelnienie
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLocked || isPending}
                  className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isLocked || isPending
                    ? "bg-gray-900 cursor-not-allowed opacity-50"
                    : ""
                    }`}
                  placeholder="email pracowniczy"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Hasło
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLocked || isPending}
                    className={`w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isLocked || isPending
                      ? "bg-gray-900 cursor-not-allowed opacity-50"
                      : ""
                      }`}
                    placeholder="Wprowadź hasło"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLocked || isPending}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 disabled:opacity-50"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div
                  className={`text-sm ${isLocked ? "text-red-400 font-semibold" : "text-red-400"}`}
                >
                  {error}
                </div>
              )}

              {/* Attempts left */}
              {!isLocked && attemptsLeft < 3 && !error && (
                <div className="text-gray-400 text-sm">
                  Pozostało prób: {attemptsLeft}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLocked || isPending}
                className={`w-full py-2 px-4 rounded-lg transition-colors font-medium ${isLocked || isPending
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
              >
                {isPending
                  ? "Sprawdzanie..."
                  : isLocked
                    ? "Dostęp zablokowany"
                    : "Przejdź do mapy"}
              </button>
            </form>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100dvh-57px)] relative">
      <button
        onClick={handleLogout}
        disabled={isPending}
        className="absolute top-4 right-4 z-10 bg-white text-gray-700 px-4 py-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Wylogowywanie..." : "Wyloguj"}
      </button>
      <MapView />
    </div>
  );
}
