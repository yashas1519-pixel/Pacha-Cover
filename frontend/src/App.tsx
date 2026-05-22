import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Leaf, LogOut, ChevronDown, House, Map, Sparkles, Cuboid, BadgeCheck, Users, UserCircle2, ShieldAlert } from 'lucide-react';
import { Suspense, lazy, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import NatureMotion from './components/NatureMotion';
import Dock from './components/Dock';
import './index.css';

// ── Lazy-loaded pages (code splitting) ─────────────────────────────────────────
const Home = lazy(() => import('./pages/Home'));
const Prescribe = lazy(() => import('./pages/Prescribe'));
const Verify = lazy(() => import('./pages/Verify'));
const Heatmap = lazy(() => import('./pages/Heatmap'));
const AR = lazy(() => import('./pages/AR'));
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const Community = lazy(() => import('./pages/Community'));
const Intelligence = lazy(() => import('./pages/Intelligence'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Leaf size={32} color="var(--accent-green)" style={{ animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading...</span>
      </div>
    </div>
  );
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder-configure-in-env';

// ── Protected route wrapper ────────────────────────────────────────────────────
function Protected({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

// ── User avatar dropdown (inline styles → CSS classes) ─────────────────────────
function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="user-menu">
      <button
        onClick={() => setOpen(!open)}
        className="user-menu__trigger"
        aria-label="User menu"
        aria-expanded={open}
      >
        {user?.picture
          ? <img src={user.picture} alt={user.name ?? 'User avatar'} className="user-menu__avatar" />
          : <div className="user-menu__avatar-fallback">{user?.name?.[0]}</div>
        }
        <span className="user-menu__name">{user?.given_name || user?.name}</span>
        <ChevronDown size={14} color="var(--text-secondary)" />
      </button>

      {open && (
        <div className="user-menu__dropdown">
          <div className="user-menu__info">
            <div className="user-menu__info-name">{user?.name}</div>
            <div className="user-menu__info-email">{user?.email}</div>
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/profile'); }}
            className="user-menu__action"
          >
            <UserCircle2 size={15} /> View Profile
          </button>
          <button
            onClick={handleLogout}
            className="user-menu__action user-menu__action--danger"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────────
function Navbar() {
  const { isLoggedIn } = useAuth();

  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-brand">
        <Leaf size={24} color="var(--accent-green)" />
        Pacha<span>Cover</span>
      </NavLink>
      {isLoggedIn && (
        <div className="nav-links">
          <UserMenu />
        </div>
      )}
    </nav>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { to: '/', label: 'Home', icon: <House size={18} /> },
    { to: '/heatmap', label: 'Heatmap', icon: <Map size={18} /> },
    { to: '/intelligence', label: 'Alerts', icon: <ShieldAlert size={18} /> },
    { to: '/prescribe', label: 'Prescribe', icon: <Sparkles size={18} /> },
    { to: '/ar', label: 'AR View', icon: <Cuboid size={18} /> },
    { to: '/verify', label: 'Verify', icon: <BadgeCheck size={18} /> },
    { to: '/community', label: 'Community', icon: <Users size={18} /> },
  ];

  const dockItems = tabs.map((tab) => {
    const isActive = tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);
    return {
      icon: tab.icon,
      label: tab.label,
      onClick: () => navigate(tab.to),
      className: isActive ? 'is-active' : '',
    };
  });

  return (
    <div className="app-container">
      <Navbar />
      <NatureMotion key={location.pathname} />
      <main className={isLoggedIn ? 'main-with-dock' : ''}>
        <div className="page-transition" key={location.pathname}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Protected><Home /></Protected>} />
              <Route path="/heatmap" element={<Protected><Heatmap /></Protected>} />
              <Route path="/intelligence" element={<Protected><Intelligence /></Protected>} />
              <Route path="/community" element={<Protected><Community /></Protected>} />
              <Route path="/prescribe" element={<Protected><Prescribe /></Protected>} />
              <Route path="/ar" element={<Protected><AR /></Protected>} />
              <Route path="/verify" element={<Protected><Verify /></Protected>} />
              <Route path="/profile" element={<Protected><Profile /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
      {isLoggedIn && (
        <div className="bottom-dock-fixed">
          <Dock
            items={dockItems}
            panelHeight={62}
            dockHeight={74}
            baseItemSize={42}
            magnification={48}
            distance={120}
            spring={{ mass: 0.28, stiffness: 110, damping: 30 }}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
