import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { motion } from "framer-motion";
import {
  FaArrowRight,
  FaBell,
  FaBuilding,
  FaCalendarCheck,
  FaClipboardList,
  FaCog,
  FaShieldAlt,
  FaTools,
  FaUser,
  FaUsersCog,
} from "react-icons/fa";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1562774053-701939374585?w=1920&auto=format",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&auto=format",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1920&auto=format",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1920&auto=format",
];

const modules = [
  {
    title: "Facilities & Assets",
    icon: FaBuilding,
    description:
      "Browse lecture halls, labs, meeting rooms, and equipment in one organized catalogue.",
  },
  {
    title: "Booking Management",
    icon: FaCalendarCheck,
    description:
      "Request bookings, review availability, and manage approval workflows without confusion.",
  },
  {
    title: "Incident Tickets",
    icon: FaClipboardList,
    description:
      "Report issues, track ticket progress, and keep maintenance workflows transparent.",
  },
  {
    title: "Notifications",
    icon: FaBell,
    description:
      "Receive important updates for bookings, tickets, comments, and role-related changes.",
  },
];

const roles = [
  {
    title: "User",
    icon: FaUser,
    description:
      "Can browse resources, request bookings, create tickets, and receive personal notifications.",
    redirect: "After login → redirected to the user area",
  },
  {
    title: "Technician",
    icon: FaTools,
    description:
      "Can access technician ticket pages and work on assigned operational tasks.",
    redirect: "After login → redirected to technician dashboard",
  },
  {
    title: "Admin",
    icon: FaShieldAlt,
    description:
      "Can manage operational workflows such as approvals, ticket coordination, and oversight.",
    redirect: "After login → redirected to admin area",
  },
  {
    title: "System Admin",
    icon: FaUsersCog,
    description:
      "Can manage users, assign roles, control access, and oversee system-level administration.",
    redirect: "After login → redirected to system admin dashboard",
  },
];

const quickHighlights = [
  "Save Time with Online Booking",
  "Avoid Double-Booking Conflicts",
  "Get Instant Status Updates",
  "Report Issues Anytime, Anywhere",
];

const HomePage = () => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    AOS.init({ duration: 700, once: true, easing: "ease-out-cubic" });
  }, []);

  useEffect(() => {
    const slideTimer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % HERO_IMAGES.length);
    }, 4500);

    return () => window.clearInterval(slideTimer);
  }, []);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full overflow-hidden bg-slate-50 text-slate-900"
    >
      <section className="relative isolate overflow-hidden">
        {HERO_IMAGES.map((image, index) => (
          <div
            key={image}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              index === activeSlide ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${image})` }}
          />
        ))}
        <div className="absolute inset-0 bg-slate-950/65" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-3xl" data-aos="fade-up">
            <p className="inline-flex items-center rounded-full border border-cyan-300/30 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-sm">
              Smart Campus Operations Hub
            </p>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Secure campus operations with role-based access and smarter workflows.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              A unified platform for managing resources, bookings, incident tickets,
              notifications, and secure Google sign-in with role-based redirection.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGetStarted}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
              >
                Get Started
              </button>

              <button
                type="button"
                onClick={() => navigate("/resources")}
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                Explore Platform
              </button>
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              {quickHighlights.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-100 backdrop-blur-sm"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3">
              {HERO_IMAGES.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Show slide ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeSlide
                      ? "w-8 bg-white"
                      : "w-2.5 bg-white/45 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-aos="fade-up">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
            Overview
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            What this platform does
          </h2>
          <p className="mt-4 text-slate-600">
            The system supports daily campus operations with a secure, role-aware
            workflow for resource usage, maintenance handling, and real-time updates.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <div
                key={module.title}
                data-aos="fade-up"
                data-aos-delay={index * 80}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                  <Icon />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{module.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {module.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center" data-aos="fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
              Role Access
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Built around four system roles
            </h2>
            <p className="mt-4 text-slate-600">
              Each signed-in user is redirected to the correct area based on their role.
              This keeps the system organized, secure, and easy to use.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {roles.map((role, index) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.title}
                  data-aos="fade-up"
                  data-aos-delay={index * 80}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-4 flex items-center gap-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                      <Icon />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{role.title}</h3>
                      <p className="text-sm font-medium text-cyan-700">{role.redirect}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{role.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div data-aos="fade-right">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              New Feature
            </p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              System Admin role for centralized access control
            </h2>
            <p className="mt-4 max-w-2xl text-slate-300">
              As an innovation feature, the platform introduces a dedicated System Admin
              role to manage users, assign roles, and control system-level access
              separately from operational administration.
            </p>
          </div>

          <div
            data-aos="fade-left"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
          >
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                <FaCog />
              </div>
              <div>
                <h3 className="text-xl font-bold">Why this matters</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <li>Separates system-level access from daily operational admin work.</li>
                  <li>Makes role management clearer and more secure.</li>
                  <li>Supports protected routing and role-based redirection after login.</li>
                  <li>Provides a clean innovation point for the assignment demo.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-cyan-600 to-blue-700 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8" data-aos="fade-up">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-cyan-50">
            Sign in or create an account with your email, or authenticate with Google.
            Access the correct dashboard automatically according to your assigned role.
          </p>

          <button
            type="button"
            onClick={handleGetStarted}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-bold text-cyan-700 shadow-xl transition hover:-translate-y-0.5"
          >
            Get Started Now
            <FaArrowRight />
          </button>
        </div>
      </section>
    </motion.div>
  );
};

export default HomePage;
