import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  FaArrowRight,
  FaBell,
  FaBook,
  FaBuilding,
  FaCalendarCheck,
  FaCheckCircle,
  FaClipboardList,
  FaShieldAlt,
  FaStar,
  FaTicketAlt,
  FaUsers,
} from "react-icons/fa";
import "swiper/css";
import "swiper/css/pagination";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1562774053-701939374585?w=1920&auto=format",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&auto=format",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1920&auto=format",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1920&auto=format",
];
const CTA_BG_URL =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&auto=format";

const moduleCards = [
  {
    id: "A",
    name: "Facilities & Assets Catalogue",
    icon: FaBuilding,
    description: "Manage lecture halls, labs, equipment, and all physical campus assets in one place.",
    route: "/admin",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=500&auto=format",
  },
  {
    id: "B",
    name: "Booking Management",
    icon: FaCalendarCheck,
    description: "Handle booking requests, approvals, schedules, and conflicts with a clear workflow.",
    route: "/bookings",
    image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=500&auto=format",
  },
  {
    id: "C",
    name: "Incident Tickets",
    icon: FaTicketAlt,
    description: "Track maintenance and service issues with priorities, status updates, and ownership.",
    route: "/tickets",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format",
  },
  {
    id: "D",
    name: "Notifications",
    icon: FaBell,
    description: "Deliver instant campus-wide alerts and targeted updates in real time.",
    route: "/notifications",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format",
  },
  {
    id: "E",
    name: "Authentication",
    icon: FaShieldAlt,
    description: "Secure role-based access for administrators, staff, and students.",
    route: "/login",
    image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=500&auto=format",
  },
];

const features = [
  {
    title: "Resource Management",
    icon: FaBuilding,
    description: "Centralized visibility of facilities, assets, and operational availability.",
  },
  {
    title: "Booking System",
    icon: FaBook,
    description: "Fast booking flows with clear availability and schedule control.",
  },
  {
    title: "Incident Tickets",
    icon: FaClipboardList,
    description: "Structured ticket lifecycle from issue reporting to closure.",
  },
  {
    title: "Real-time Notifications",
    icon: FaBell,
    description: "Immediate alerts for status changes, incidents, and booking events.",
  },
];

const statTargets = [
  { key: "resources", label: "Total Resources", target: 12, icon: FaBuilding },
  { key: "bookings", label: "Active Bookings", target: 28, icon: FaCalendarCheck },
  { key: "tickets", label: "Resolved Tickets", target: 45, icon: FaCheckCircle },
  { key: "users", label: "Active Users", target: 156, icon: FaUsers },
];

const testimonials = [
  {
    name: "Naduni Perera",
    role: "Facilities Coordinator",
    quote:
      "Our operations team now coordinates bookings and maintenance in half the time. The visibility is outstanding.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Kavindu Silva",
    role: "Student Services Lead",
    quote:
      "Students instantly see what is available and receive updates without confusion. It drastically improved trust.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Ayesha Fernando",
    role: "Campus Operations Manager",
    quote:
      "The ticketing and notification flows are seamless. We can resolve incidents faster and keep everyone informed.",
    avatar:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=200&q=80",
  },
];

const AnimatedStat = ({ label, target, icon: Icon }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.35 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    };

    window.requestAnimationFrame(tick);
  }, [inView, target]);

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:scale-[1.03] hover:shadow-xl"
      data-aos="fade-up"
    >
      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md">
        <Icon className="text-lg" />
      </div>
      <p className="text-center text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const fullTitle = "Smart Campus Operations Hub";
  const [typedTitle, setTypedTitle] = useState("");
  const [countdown, setCountdown] = useState(48 * 60 * 60);
  const [loadedImages, setLoadedImages] = useState({});
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  useEffect(() => {
    AOS.init({ duration: 700, once: true, easing: "ease-out-cubic" });
  }, []);

  useEffect(() => {
    let index = 0;
    const typingTimer = window.setInterval(() => {
      index += 1;
      setTypedTitle(fullTitle.slice(0, index));
      if (index >= fullTitle.length) {
        window.clearInterval(typingTimer);
      }
    }, 85);

    return () => window.clearInterval(typingTimer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const heroTimer = window.setInterval(() => {
      setActiveHeroIndex((previous) => (previous + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => window.clearInterval(heroTimer);
  }, []);

  const countdownLabel = useMemo(() => {
    const hours = String(Math.floor(countdown / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((countdown % 3600) / 60)).padStart(2, "0");
    const seconds = String(countdown % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }, [countdown]);

  const goToRoute = (route) => {
    navigate(route);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="overflow-hidden bg-white text-slate-900"
      style={{
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        marginTop: "-1.5rem",
        marginBottom: "-1.5rem",
      }}
    >
      <section className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          {HERO_IMAGES.map((image, index) => (
            <div
              key={image}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
              style={{
                backgroundImage: `url(${image})`,
                opacity: activeHeroIndex === index ? 1 : 0,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-slate-950/22" />
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <span
              key={`shape-${i}`}
              className="absolute rounded-full bg-white/10"
              style={{
                width: `${20 + i * 12}px`,
                height: `${20 + i * 12}px`,
                left: `${8 + i * 11}%`,
                top: `${12 + (i % 3) * 24}%`,
                animation: `float ${4 + i * 0.4}s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto flex h-full min-h-screen max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl" data-aos="fade-up">
            <p className="mb-4 inline-flex items-center rounded-full border border-white/30 bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              Campus Digital Command Center
            </p>
            <h1 className="min-h-[70px] text-4xl font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:min-h-[94px] sm:text-5xl md:text-6xl">
              {typedTitle}
              <span className="animate-pulse">|</span>
            </h1>
            <p className="mt-5 text-base text-slate-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)] sm:text-lg">
              Complete campus management solution for facilities, bookings, and incident handling
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => goToRoute("/admin")}
                className="animate-pulse rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Launch Dashboard
              </button>
              <button
                type="button"
                onClick={() => goToRoute("/student")}
                className="rounded-xl border border-slate-400 bg-white/70 px-6 py-3 text-sm font-bold text-slate-800 backdrop-blur transition hover:bg-white"
              >
                Student View
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center" data-aos="fade-up">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">Insights</p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Live Statistics</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statTargets.map((item) => (
            <AnimatedStat key={item.key} label={item.label} target={item.target} icon={item.icon} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 bg-slate-50">
        <div className="mb-10 text-center" data-aos="fade-up">
          {/* <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-500">Modules</p> */}
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Platform Modules</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {moduleCards.map((module, index) => {
            const Icon = module.icon;
            const imageLoaded = loadedImages[module.id];
            return (
              <motion.article
                key={module.id}
                whileHover={{ y: -10 }}
                transition={{ duration: 0.25 }}
                data-aos="fade-up"
                data-aos-delay={index * 80}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative h-48 overflow-hidden">
                  {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700" />}
                  <img
                    src={module.image}
                    alt={module.name}
                    onLoad={() => setLoadedImages((prev) => ({ ...prev, [module.id]: true }))}
                    className={`h-full w-full object-cover transition duration-500 group-hover:scale-110 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/25 to-transparent opacity-80 transition duration-300 group-hover:opacity-100" />
                  <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    <Icon /> {module.id}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-bold text-slate-900">{module.name}</h3>
                  <p className="mt-3 min-h-[72px] text-sm text-slate-600">{module.description}</p>
                  <button
                    type="button"
                    onClick={() => goToRoute(module.route)}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Explore
                    <FaArrowRight className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center" data-aos="fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">Features</p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Core Capabilities</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  data-aos="fade-up"
                  data-aos-delay={index * 80}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition duration-300 hover:-translate-y-1 hover:bg-cyan-50 hover:shadow-lg"
                >
                  <div
                    className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    style={{ animation: `float ${2.4 + index * 0.2}s ease-in-out infinite` }}
                  >
                    <Icon />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 bg-slate-50" data-aos="fade-up">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">Testimonials</p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">What People Say</h2>
        </div>

        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          loop
          spaceBetween={20}
          className="pb-12"
        >
          {testimonials.map((item) => (
            <SwiperSlide key={item.name}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
                  <img src={item.avatar} alt={item.name} className="h-16 w-16 rounded-full object-cover" />
                  <div>
                    <div className="mb-2 flex justify-center gap-1 md:justify-start">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={`${item.name}-star-${i}`} className="text-amber-400" />
                      ))}
                    </div>
                    <p className="text-base text-slate-600">\"{ item.quote }\"</p>
                    <p className="mt-4 text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.role}</p>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      <section
        className="relative overflow-hidden bg-fixed py-20"
        style={{
          backgroundImage: `linear-gradient(115deg, rgba(3,102,214,0.85), rgba(6,182,212,0.75)), url(${CTA_BG_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center text-white sm:px-6 lg:px-8" data-aos="fade-up">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to Modernize Campus Operations?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-cyan-50">
            Launch unified workflows for facilities, bookings, incidents, and communication today.
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-blue-100">
            Early Access Closes In {countdownLabel}
          </p>

          <button
            type="button"
            onClick={() => goToRoute("/login")}
            className="group relative mt-8 inline-flex items-center justify-center overflow-hidden rounded-xl bg-white px-7 py-3 text-sm font-bold text-cyan-700 shadow-xl transition hover:-translate-y-0.5"
          >
            <span className="absolute h-5 w-5 animate-ping rounded-full bg-cyan-300/60" />
            <span className="relative">Start Free Pilot</span>
          </button>
        </div>
      </section>

      <style>
        {`@keyframes float { 0% { transform: translateY(0px);} 50% { transform: translateY(-10px);} 100% { transform: translateY(0px);} }`}
      </style>
    </motion.div>
  );
};

export default HomePage;