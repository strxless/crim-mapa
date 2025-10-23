"use client";

import { useState, useTransition, useEffect } from "react";
import MapView from "@/components/MapView";
import { login, logout, checkAuth } from "./actions/auth";

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isLocked, setIsLocked] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Check auth status on mount
    checkAuth().then((authenticated) => {
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || isPending) return;

    setError("");

    const formData = new FormData();
    formData.append("password", password);

    startTransition(async () => {
      const result = await login(formData);

      if (result.success) {
        setIsAuthenticated(true);
        setPassword("");
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
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Hasło
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLocked || isPending}
                  className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    isLocked || isPending
                      ? "bg-gray-900 cursor-not-allowed opacity-50"
                      : ""
                  }`}
                  placeholder="Wprowadź hasło"
                  autoFocus
                />
              </div>
              {error && (
                <div
                  className={`text-sm ${isLocked ? "text-red-400 font-semibold" : "text-red-400"}`}
                >
                  {error}
                </div>
              )}
              {!isLocked && attemptsLeft < 3 && !error && (
                <div className="text-gray-400 text-sm">
                  Pozostało prób: {attemptsLeft}
                </div>
              )}
              <button
                type="submit"
                disabled={isLocked || isPending}
                className={`w-full py-2 px-4 rounded-lg transition-colors font-medium ${
                  isLocked || isPending
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
