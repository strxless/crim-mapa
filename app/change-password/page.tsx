"use client";
export const dynamic = 'force-dynamic';


import { useState, useTransition, useEffect } from "react";
import { changePassword, getCurrentUser, logout } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/");
        return;
      }
      setUserEmail(user.email);
      setIsLoading(false);
    };
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);
    formData.append("confirmPassword", confirmPassword);

    startTransition(async () => {
      const result = await changePassword(formData);

      if (result.success) {
        setSuccess(result.message || "Hasło zostało zmienione!");
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 2000);
      } else {
        setError(result.error || "Wystąpił błąd");
      }
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  const togglePassword = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const EyeIcon = ({ show }: { show: boolean }) => {
    if (show) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full h-[calc(100dvh-57px)] flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100dvh-57px)] flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md px-6">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Zmień hasło
            </h2>
            <p className="text-gray-400 text-center text-sm">
              Zalogowano jako: <span className="text-white">{userEmail}</span>
            </p>
            <p className="text-gray-500 text-center text-xs mt-1">
              Wymagana zmiana hasła przy pierwszym logowaniu
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Obecne hasło
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isPending}
                  className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                  placeholder="Wprowadź obecne hasło"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePassword("current")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  tabIndex={-1}
                >
                  <EyeIcon show={showPasswords.current} />
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Nowe hasło
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isPending}
                  minLength={8}
                  className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                  placeholder="Minimum 8 znaków"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePassword("new")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  tabIndex={-1}
                >
                  <EyeIcon show={showPasswords.new} />
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Potwierdź nowe hasło
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isPending}
                  minLength={8}
                  className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                  placeholder="Wprowadź hasło ponownie"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePassword("confirm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  tabIndex={-1}
                >
                  <EyeIcon show={showPasswords.confirm} />
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
              <p className="text-blue-300 text-xs font-medium mb-1">
                Wymagania hasła:
              </p>
              <ul className="text-blue-200 text-xs space-y-0.5 list-disc list-inside">
                <li>Minimum 8 znaków</li>
                <li>Użyj kombinacji liter, cyfr i znaków specjalnych</li>
              </ul>
            </div>

            {/* Error/Success messages */}
            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                <p className="text-green-400 text-sm">{success}</p>
                <p className="text-green-300 text-xs mt-1">Przekierowanie...</p>
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-2">
              <button
                type="submit"
                disabled={isPending || !!success}
                className="w-full py-2 px-4 rounded-lg transition-colors font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isPending ? "Zmiana hasła..." : "Zmień hasło"}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending || !!success}
                className="w-full py-2 px-4 rounded-lg transition-colors font-medium bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
              >
                Anuluj i wyloguj
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
