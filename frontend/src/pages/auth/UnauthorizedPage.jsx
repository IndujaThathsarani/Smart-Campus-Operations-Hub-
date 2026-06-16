import { useNavigate } from "react-router-dom";
import { FaLock, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { getDashboardPath } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <FaLock className="text-2xl" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900">
          Access Denied
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          You do not have permission to access this page. Please return to your assigned dashboard.
        </p>

        <button
          type="button"
          onClick={() => navigate(getDashboardPath())}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5"
        >
          <FaArrowLeft />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;