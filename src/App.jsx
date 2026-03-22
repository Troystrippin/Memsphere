import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  supabase,
  isSupabaseConfigured,
  testSupabaseConnection,
} from "./lib/supabase";
import { DarkModeProvider } from "./contexts/DarkModeContext";
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
import BusinessReviews from "./pages/BusinessReviews";
import LandingPage from "./pages/LandingPage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import OwnerProfile from "./pages/OwnerProfile";
import Notifications from "./pages/Notifications";
import OwnerMemberManagement from "./pages/OwnerMemberManagement";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminBusinessManagement from "./pages/AdminBusinessManagement";
import AdminSettings from "./pages/AdminSettings";
import AdminProfile from "./components/admin/AdminProfile";
import OwnerNotifications from "./pages/OwnerNotifications";
import OwnerSettings from "./pages/OwnerSettings";
import { useTheme } from "./contexts/ThemeContext";
import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { isDarkMode } = useTheme();

  const hasProcessedSignIn = useRef(false);
  const authInitialized = useRef(false);
  const navigationInProgress = useRef(false);
  const fetchRetryCount = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    if (!isSupabaseConfigured()) {
      console.error("Supabase is not configured properly");
      setConfigError(true);
      setLoading(false);
      setAuthChecked(true);
      return;
    }

    const initializeAuth = async () => {
      try {
        console.log("🔍 Initializing auth...");

        const isConnected = await testSupabaseConnection();
        if (!isConnected) {
          console.error("❌ Cannot connect to Supabase");
          setAuthError("Cannot connect to database");
          setLoading(false);
          setAuthChecked(true);
          return;
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          localStorage.removeItem("sb-session");
          setAuthError(error.message);
          setLoading(false);
          setAuthChecked(true);
          return;
        }

        console.log(
          "📦 Initial session:",
          session?.user?.email || "No session",
        );

        if (session?.user) {
          const { data: userData, error: userError } =
            await supabase.auth.getUser();

          if (userError || !userData?.user) {
            console.log("❌ Session is invalid, clearing...");
            localStorage.removeItem("sb-session");
            setSession(null);
            setLoading(false);
            setAuthChecked(true);
            return;
          }

          setSession(session);
          console.log("👤 Valid session found for:", session.user.email);
          await fetchUserRole(session.user.id);
        } else {
          console.log("👤 No valid session");
          localStorage.removeItem("sb-session");
          setSession(null);
          setUserRole(undefined);
          setLoading(false);
          setAuthChecked(true);
        }
      } catch (error) {
        console.error("Error in auth initialization:", error);
        localStorage.removeItem("sb-session");
        setAuthError(error.message);
        setLoading(false);
        setAuthChecked(true);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "🔄 Auth state changed - event:",
        event,
        "email:",
        session?.user?.email,
      );

      setSession(session);

      if (event === "SIGNED_IN" && session?.user) {
        console.log("✅ User signed in:", session.user.email);
        hasProcessedSignIn.current = true;
        setInitialRedirectDone(false);
        setAuthError(null);
        setLoading(true);
        setUserRole(undefined);
        try {
          await fetchUserRole(session.user.id);
        } catch (error) {
          console.error("Error in sign in flow:", error);
          setLoading(false);
          setAuthChecked(true);
        }
      } else if (event === "TOKEN_REFRESHED") {
        console.log("🔄 Token refreshed");
        if (session?.user) {
          try {
            await fetchUserRole(session.user.id);
          } catch (error) {
            console.error("Error in token refresh:", error);
            setLoading(false);
          }
        }
      } else if (event === "SIGNED_OUT") {
        console.log("👤 User signed out");
        localStorage.removeItem("sb-session");
        setUserRole(undefined);
        setSession(null);
        setAuthError(null);
        setLoading(false);
        setInitialRedirectDone(false);
        hasProcessedSignIn.current = false;
        navigationInProgress.current = false;
        fetchRetryCount.current = 0;

        navigate("/", { replace: true });
      } else if (event === "USER_UPDATED") {
        console.log("👤 User updated");
        if (session?.user) {
          await fetchUserRole(session.user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      authInitialized.current = false;
    };
  }, [navigate]);

  const fetchUserRole = async (userId) => {
    fetchRetryCount.current = 0;

    try {
      console.log("🔍 Fetching role for user ID:", userId);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Fetch timeout")), 5000),
      );

      const fetchPromise = supabase
        .from("profiles")
        .select("id, email, role, first_name, last_name")
        .eq("id", userId)
        .maybeSingle();

      const { data, error } = await Promise.race([
        fetchPromise,
        timeoutPromise,
      ]);

      if (error) {
        console.error("❌ Error fetching user role:", error);
        if (error.code === "PGRST301" || error.message?.includes("JWT")) {
          console.log("❌ JWT error - session may be invalid");
          localStorage.removeItem("sb-session");
          setSession(null);
          setUserRole(undefined);
        } else {
          setUserRole("client");
        }
        setAuthError("Error loading user profile");
        setLoading(false);
        setAuthChecked(true);
        return;
      }

      if (data) {
        console.log("✅ User role from database:", data?.role);
        setUserRole(data?.role || "client");
        setAuthError(null);
      } else {
        console.log("⚠️ No profile found, defaulting to client role");
        setUserRole("client");
      }
    } catch (error) {
      console.error("❌ Error in fetchUserRole:", error);
      setUserRole("client");
      setAuthError(error.message);

      if (fetchRetryCount.current < 2) {
        fetchRetryCount.current++;
        console.log(
          `🔄 Retrying fetchUserRole (attempt ${fetchRetryCount.current + 1}/3)...`,
        );
        setTimeout(() => {
          fetchUserRole(userId);
        }, 1000);
        return;
      }
    } finally {
      console.log("✅ Role fetch complete");
      setLoading(false);
      setAuthChecked(true);
    }
  };

  // Timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !authChecked) {
        console.log("⚠️ Loading timeout - forcing completion");
        setAuthChecked(true);
        setLoading(false);
        setUserRole("client");
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [loading, authChecked]);

  // Handle initial redirect
  useEffect(() => {
    if (loading || !authChecked) {
      return;
    }

    if (!session) {
      return;
    }

    if (userRole === undefined) {
      return;
    }

    if (navigationInProgress.current || initialRedirectDone) {
      return;
    }

    const currentPath = window.location.pathname;
    console.log("📍 Navigation check - Path:", currentPath, "Role:", userRole);

    const publicPaths = [
      "/login",
      "/",
      "/register",
      "/forgot-password",
      "/about",
      "/contact",
    ];

    if (publicPaths.includes(currentPath)) {
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
      navigationInProgress.current = false;
    } else {
      setInitialRedirectDone(true);
    }
  }, [loading, authChecked, session, userRole, navigate, initialRedirectDone]);

  // Debug logging
  useEffect(() => {
    console.log("📊 App State Update:", {
      loading,
      authChecked,
      session: session?.user?.email,
      userRole,
      path: window.location.pathname,
      initialRedirectDone,
      authError,
    });
  }, [loading, authChecked, session, userRole, initialRedirectDone, authError]);

  // Don't render anything until auth is checked
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-4">Loading application...</p>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-purple-400 to-pink-500 text-white">
        <h1 className="text-3xl font-bold mb-4">Configuration Error</h1>
        <p className="mb-4">
          Supabase is not configured properly. Please check your environment
          variables.
        </p>
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
      <div className="min-h-screen flex items-center justify-center select-none">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    console.log(
      "🛡️ ProtectedRoute - Session:",
      !!session,
      "Role:",
      userRole,
      "AuthChecked:",
      authChecked,
    );

    if (!session) {
      console.log("🔒 No session, redirecting to login");
      return <Navigate to="/login" replace />;
    }

    if (userRole === null) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-4">Loading your profile...</p>
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

  // Dynamic Profile Component - redirects based on role
  const DynamicProfile = () => {
    if (userRole === "owner") {
      return <Navigate to="/owner-profile" replace />;
    }
    return <Profile />;
  };

  return (
    <DarkModeProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

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
        <Route
          path="/business-reviews/:businessId"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <BusinessReviews />
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
        <Route
          path="/owner-notifications"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <OwnerNotifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner-settings"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <OwnerSettings />
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
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminProfile />
            </ProtectedRoute>
          }
        />

        {/* Shared Protected Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["owner", "client"]}>
              <DynamicProfile />
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
    </DarkModeProvider>
  );
}

export default App;
