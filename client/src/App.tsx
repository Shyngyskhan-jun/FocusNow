import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

// Pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import TasksPage from "./pages/TasksPage";
import FocusSessionsPage from "./pages/FocusSessionsPage";
import StatsPage from "./pages/StatsPage";
import AnalysisPage from "./pages/AnalysisPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";

// Components
import Navbar from "./components/Navbar";

// Hooks
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";

export type Theme = "light" | "dark";

// ─── Protected Layout ───
const ProtectedLayout = ({
  isLoggedIn,
  onLogout,
}: {
  isLoggedIn: boolean;
  onLogout: () => void;
}) => {
  if (!isLoggedIn) return <Navigate to="/" replace />;

  return (
    <div className="app-layout">
      <Navbar onLogout={onLogout} />
      <main className="main-content container">
        <Outlet />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const { loggedIn, handleLogin, handleLogout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-wrapper">
      <Routes>
        {/* Landing */}
        <Route
          path="/"
          element={
            !loggedIn ? (
              <LandingPage theme={theme} onToggleTheme={toggleTheme} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* Auth */}
        <Route
          path="/auth"
          element={
            !loggedIn ? (
              <AuthPage
                onLogin={handleLogin}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* Protected */}
        <Route
          element={
            <ProtectedLayout isLoggedIn={loggedIn} onLogout={handleLogout} />
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/focus" element={<FocusSessionsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/settings"
            element={
              <SettingsPage
                toggleTheme={toggleTheme}
                theme={theme}
                onLogout={handleLogout}
              />
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;