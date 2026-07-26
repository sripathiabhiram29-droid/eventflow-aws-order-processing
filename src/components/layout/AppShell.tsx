import {
  Activity,
  Box,
  Boxes,
  Github,
  HeartPulse,
  LayoutDashboard,
  Menu,
  PlusCircle,
  RadioTower,
  RefreshCw,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEventFlow } from "../../hooks/useEventFlow";
import { ToastRegion } from "../common/Common";

const navigation = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/orders/new", label: "Create Order", icon: PlusCircle },
  { to: "/orders", label: "Orders", icon: Box },
  { to: "/events", label: "Event Monitor", icon: RadioTower },
  { to: "/architecture", label: "Architecture", icon: Workflow },
  { to: "/health", label: "System Health", icon: HeartPulse },
];

const pageTitles: Record<string, string> = {
  "/": "Operations Overview",
  "/orders/new": "Create Order",
  "/orders": "Orders",
  "/events": "Event Monitor",
  "/architecture": "Architecture",
  "/health": "System Health",
};

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { refresh, simulateNext, mockMode, toasts, dismissToast } = useEventFlow();
  const title =
    location.pathname.startsWith("/orders/") && location.pathname !== "/orders/new"
      ? "Order Details"
      : (pageTitles[location.pathname] ?? "EventFlow");
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Boxes size={22} />
          </div>
          <div>
            <strong>EventFlow</strong>
            <span>AWS operations</span>
          </div>
          <button
            className="mobile-close"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Primary navigation">
          {navigation.map(({ to, label, icon: Icon, exact }) => (
            <NavLink end={exact} key={to} to={to} onClick={() => setMobileOpen(false)}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-status">
          <span className="live-pulse" />
          <div>
            <strong>Mock services online</strong>
            <span>3 processors healthy</span>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="app-main">
        <div className="portfolio-banner">
          <Zap size={14} /> Serverless AWS Portfolio Project{" "}
          <span>— Event-driven processing with SNS and SQS</span>
        </div>
        <header className="top-header">
          <div className="top-title">
            <button
              className="mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </button>
            <div>
              <span>EventFlow</span>
              <h2>{title}</h2>
            </div>
          </div>
          <div className="header-actions">
            <span className={`environment-badge ${mockMode ? "mock" : "connected"}`}>
              <span />
              {mockMode ? "Mock Mode" : "AWS Connected"}
            </span>
            <button className="button secondary compact" onClick={() => void refresh()}>
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
            <button className="button primary compact" onClick={() => simulateNext()}>
              <Activity size={16} />
              <span>Simulate Event</span>
            </button>
            <a
              className="icon-button"
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="View GitHub repository"
            >
              <Github size={19} />
            </a>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <ToastRegion toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
