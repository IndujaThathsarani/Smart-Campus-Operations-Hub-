import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";
import { FaArrowLeft } from "react-icons/fa";

export default function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("signin");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Smart Campus Hub
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Secure campus operations platform
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("signin")}
              className={`flex-1 py-4 px-6 font-semibold transition ${
                activeTab === "signin"
                  ? "text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`flex-1 py-4 px-6 font-semibold transition ${
                activeTab === "signup"
                  ? "text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "signin" ? <SignInForm /> : <SignUpForm />}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition"
          >
            <FaArrowLeft size={16} />
            Back to Home
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>© 2026 Smart Campus Operations Hub. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
