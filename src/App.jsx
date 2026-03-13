import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ClientDashboard from "./pages/ClientDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MyBusinessPage from "./pages/MyBusinessPage";
import Applications from "./pages/Applications";
import Analytics from "./pages/Analytics";
import Browse from "./pages/Browse";
import LandingPage from "./pages/LandingPage";
import About from "./pages/About";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import OwnerMemberManagement from "./pages/OwnerMemberManagement";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminBusinessManagement from "./pages/AdminBusinessManagement";
import AdminSettings from "./pages/AdminSettings";
import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);

  // Use refs to prevent duplicate processing
  const hasProcessedSignIn = useRef(false);
  const authInitialized = useRef(false);
  const navigationInProgress = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (authInitialized.current) return;
    authInitialized.current = true;

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.error("Supabase is not configured properly");
      setConfigError(true);
      setLoading(false);
      return;
    }

    // Check active session
    const initializeAuth = async () => {
      try {
        console.log("🔍 Initializing auth...");
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
        }

        console.log(
          "📦 Initial session:",
          session?.user?.email || "No session",
        );
        setSession(session);

        if (session?.user) {
          console.log(
            "👤 User found in session, fetching role for:",
            session.user.email,
          );
          await fetchUserRole(session.user.id);
        } else {
          console.log("👤 No user in session");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in auth initialization:", error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(
        "🔄 Auth state changed - event:",
        _event,
        "email:",
        session?.user?.email,
      );

      // Update session state
      setSession(session);

      // Handle sign in
      if (_event === "SIGNED_IN" && session?.user) {
        // Check if we've already processed this sign-in
        if (hasProcessedSignIn.current) {
          console.log("⏭️ Sign-in already processed, skipping...");
          return;
        }

        console.log("✅ Processing new sign-in for:", session.user.email);
        hasProcessedSignIn.current = true;
        setInitialRedirectDone(false); // Reset redirect flag on new sign in
        setLoading(true);
        await fetchUserRole(session.user.id);
      }
      // Handle sign out
      else if (_event === "SIGNED_OUT") {
        console.log("👤 User signed out");
        setUserRole(null);
        setSession(null);
        setLoading(false);
        setInitialRedirectDone(false);
        hasProcessedSignIn.current = false;
        navigationInProgress.current = false;
      }
      // Handle initial session
      else if (
        _event === "INITIAL_SESSION" &&
        session?.user &&
        !hasProcessedSignIn.current
      ) {
        console.log("🔄 Initial session loaded for:", session.user.email);
        hasProcessedSignIn.current = true;
        await fetchUserRole(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      authInitialized.current = false;
    };
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      console.log("🔍 Fetching role for user ID:", userId);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, first_name, last_name")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("❌ Error fetching user role:", error);
        console.log("⚠️ Defaulting to client role");
        setUserRole("client");
        return;
      }

      if (data) {
        console.log("📊 Full profile data:", data);
        console.log("✅ User role from database:", data?.role);
        setUserRole(data?.role || "client");
      } else {
        console.log("⚠️ No profile found, defaulting to client role");
        setUserRole("client");
      }
    } catch (error) {
      console.error("❌ Error in fetchUserRole:", error);
      setUserRole("client");
    } finally {
      console.log("✅ Setting loading to false");
      setLoading(false);
    }
  };

  // Handle initial redirect only once
  useEffect(() => {
    // Don't navigate if still loading or missing data
    if (loading || !session || !userRole) {
      console.log("⏳ Waiting for navigation conditions:", {
        loading,
        hasSession: !!session,
        hasRole: !!userRole,
      });
      return;
    }

    // Prevent multiple navigation attempts
    if (navigationInProgress.current || initialRedirectDone) {
      console.log("🚫 Navigation already in progress or done, skipping");
      return;
    }

    const currentPath = window.location.pathname;
    console.log("📍 Navigation check - Path:", currentPath, "Role:", userRole);

    // Only redirect from login/root to dashboard
    if (currentPath === "/login" || currentPath === "/") {
      navigationInProgress.current = true;
      let destination;
      
      if (userRole === "owner") {
        destination = "/owner-dashboard";
      } else if (userRole === "admin") {
        destination = "/admin-dashboard";
      } else {
        destination = "/ClientDashboard";
      }
      
      console.log(`🏠 Redirecting from ${currentPath} to ${destination}`);
      
      navigate(destination, { replace: true });
      setInitialRedirectDone(true);
      
      // Reset navigation flag after a delay
      setTimeout(() => {
        navigationInProgress.current = false;
      }, 500);
    } else {
      // If we're already on a valid page, mark redirect as done
      setInitialRedirectDone(true);
    }

  }, [loading, session, userRole, navigate, initialRedirectDone]);

  // Add a debug effect to log state changes
  useEffect(() => {
    console.log("📊 App State Update:", {
      loading,
      session: session?.user?.email,
      userRole,
      path: window.location.pathname,
      initialRedirectDone,
    });
  }, [loading, session, userRole, initialRedirectDone]);

  // Protected Route wrapper component
  const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    console.log(
      "🛡️ ProtectedRoute - Session:",
      !!session,
      "Role:",
      userRole,
      "Loading:",
      loading,
      "Path:",
      window.location.pathname,
    );

    if (configError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-purple-400 to-pink-500 text-white">
          <h1 className="text-3xl font-bold mb-4">Configuration Error</h1>
          <p className="mb-4">Supabase is not configured properly. Please check your environment variables.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition"
          >
            Retry
          </button>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-400 to-pink-500">
          <div className="text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-4 text-white text-lg">Loading...</p>
          </div>
        </div>
      );
    }

    if (!session) {
      console.log("🔒 No session, redirecting to login");
      return <Navigate to="/login" replace />;
    }

    if (userRole === null) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-400 to-pink-500">
          <div className="text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-4 text-white text-lg">Loading your profile...</p>
          </div>
        </div>
      );
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      console.log("🚫 Role not allowed, redirecting...");
      let destination;
      if (userRole === "owner") {
        destination = "/owner-dashboard";
      } else if (userRole === "admin") {
        destination = "/admin-dashboard";
      } else {
        destination = "/ClientDashboard";
      }
      return <Navigate to={destination} replace />;
    }

    console.log("✅ Access granted");
    return children;
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/about" element={<About />} />

      {/* Client Routes */}
      <Route
        path="/ClientDashboard"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/browse"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <Browse />
          </ProtectedRoute>
        }
      />

      {/* Owner Routes */}
      <Route
        path="/owner-dashboard"
        element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-business"
        element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <MyBusinessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <Applications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <OwnerMemberManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <Analytics />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminUserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/businesses"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminBusinessManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminSettings />
          </ProtectedRoute>
        }
      />

      {/* Shared Protected Routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["owner", "client", "admin"]}>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={["owner", "client", "admin"]}>
            <Notifications />
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route
        path="/dashboard"
        element={<Navigate to="/ClientDashboard" replace />}
      />
      <Route
        path="/client-dashboard"
        element={<Navigate to="/ClientDashboard" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;