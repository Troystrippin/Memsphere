import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  testSupabaseConnection,
} from "./lib/supabase";
import { ThemeProvider } from "./contexts/ThemeContext";
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
import "./App.css";
import logo from "./assets/logo_final.png";

// Enhanced Maintenance Page Component with larger content
const MaintenancePage = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
      
      if (!error && data && data.value === 'false') {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (profile?.role === 'owner') {
            navigate('/owner-dashboard', { replace: true });
          } else if (profile?.role === 'admin') {
            navigate('/admin-dashboard', { replace: true });
          } else if (profile?.role === 'client') {
            navigate('/ClientDashboard', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        } else {
          navigate('/login', { replace: true });
        }
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error);
      window.location.reload();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100 select-none">
      <div className="text-center p-8 max-w-2xl">
        {/* Logo - Made Larger */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-8"
        >
          <div className="w-48 h-48 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl">
            <img 
              src={logo} 
              alt="Memsphere Logo" 
              className="w-36 h-36 object-contain"
            />
          </div>
        </motion.div>

        {/* Title - Larger Text */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4 select-none"
        >
          Under Maintenance
        </motion.h1>

        {/* Subtitle - Larger Text */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-gray-600 mb-8 select-none"
        >
          We're currently performing scheduled maintenance to improve your experience.
        </motion.p>

        {/* Info Card - Larger */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 select-none"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
            <span className="text-lg font-semibold text-gray-700">Maintenance in Progress</span>
          </div>
          <p className="text-base text-gray-500 select-none">
            Our team is working hard to bring you new features and improvements.
            Please check back soon!
          </p>
        </motion.div>

        {/* Admin Access Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-4 border-t border-gray-200 select-none"
        >
          <p className="text-sm text-gray-400 select-none">
            ⚡ Administrators can still access the dashboard
          </p>
        </motion.div>

        {/* Check Status Button - Larger */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCheckStatus}
          disabled={checking}
          className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto select-none disabled:opacity-50 text-base"
        >
          {checking ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Check Status
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(undefined);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);

  const hasProcessedSignIn = useRef(false);
  const authInitialized = useRef(false);
  const navigationInProgress = useRef(false);
  const fetchRetryCount = useRef(0);
  const navigate = useNavigate();

  // Check maintenance mode - also listen for changes
  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single();
        
        if (!error && data && data.value === 'true') {
          setMaintenanceMode(true);
        } else {
          setMaintenanceMode(false);
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
        setMaintenanceMode(false);
      } finally {
        setMaintenanceChecked(true);
      }
    };

    checkMaintenanceMode();
  }, []);

  // Set up real-time subscription for maintenance mode changes
  useEffect(() => {
    const maintenanceSubscription = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.maintenance_mode'
        },
        (payload) => {
          console.log('Maintenance mode changed:', payload);
          const newValue = payload.new?.value === 'true';
          setMaintenanceMode(newValue);
          
          // If maintenance mode is turned off and user is on maintenance page, redirect
          if (!newValue && window.location.pathname === '/maintenance') {
            const redirectToDashboard = async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', user.id)
                  .single();
                
                if (profile?.role === 'owner') {
                  navigate('/owner-dashboard', { replace: true });
                } else if (profile?.role === 'admin') {
                  navigate('/admin-dashboard', { replace: true });
                } else if (profile?.role === 'client') {
                  navigate('/ClientDashboard', { replace: true });
                } else {
                  navigate('/', { replace: true });
                }
              } else {
                navigate('/login', { replace: true });
              }
            };
            redirectToDashboard();
          }
        }
      )
      .subscribe();

    return () => {
      maintenanceSubscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    if (!isSupabaseConfigured()) {
      console.error("Supabase is not configured properly");
      setConfigError(true);
      setLoading(false);
      setAuthChecked(true);
      setRoleLoaded(true);
      return;
    }

    const initializeAuthAndFetchData = async () => {
      try {
        console.log("🔍 Initializing auth and fetching data...");

        const isConnected = await testSupabaseConnection();
        if (!isConnected) {
          console.error("❌ Cannot connect to Supabase");
          setAuthError("Cannot connect to database");
          setLoading(false);
          setAuthChecked(true);
          setRoleLoaded(true);
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
          setRoleLoaded(true);
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
            setRoleLoaded(true);
            return;
          }

          setSession(session);
          console.log("👤 Valid session found for:", session.user.email);

          await fetchUserData(session.user.id);
        } else {
          console.log("👤 No valid session");
          localStorage.removeItem("sb-session");
          setSession(null);
          setUserRole(undefined);
          setLoading(false);
          setAuthChecked(true);
          setRoleLoaded(true);
        }
      } catch (error) {
        console.error("Error in auth initialization:", error);
        localStorage.removeItem("sb-session");
        setAuthError(error.message);
        setLoading(false);
        setAuthChecked(true);
        setRoleLoaded(true);
      }
    };

    initializeAuthAndFetchData();

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
        setRoleLoaded(false);
        setUserRole(undefined);
        try {
          await fetchUserData(session.user.id);
        } catch (error) {
          console.error("Error in sign in flow:", error);
          setLoading(false);
          setAuthChecked(true);
          setRoleLoaded(true);
        }
      } else if (event === "TOKEN_REFRESHED") {
        console.log("🔄 Token refreshed");
        if (session?.user) {
          try {
            await fetchUserData(session.user.id);
          } catch (error) {
            console.error("Error in token refresh:", error);
            setLoading(false);
          }
        }
      } else if (event === "SIGNED_OUT") {
        console.log("👤 User signed out");
        localStorage.removeItem("sb-session");
        setUserRole(undefined);
        setUserData(null);
        setSession(null);
        setAuthError(null);
        setLoading(false);
        setInitialRedirectDone(false);
        setRoleLoaded(true);
        hasProcessedSignIn.current = false;
        navigationInProgress.current = false;
        fetchRetryCount.current = 0;

        navigate("/", { replace: true });
      } else if (event === "USER_UPDATED") {
        console.log("👤 User updated");
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      authInitialized.current = false;
    };
  }, [navigate]);

  const fetchUserData = async (userId) => {
    fetchRetryCount.current = 0;

    try {
      console.log("🔍 Fetching user data for ID:", userId);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Fetch timeout")), 5000),
      );

      const fetchPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const { data, error } = await Promise.race([
        fetchPromise,
        timeoutPromise,
      ]);

      if (error) {
        console.error("❌ Error fetching user data:", error);
        if (error.code === "PGRST301" || error.message?.includes("JWT")) {
          console.log("❌ JWT error - session may be invalid");
          localStorage.removeItem("sb-session");
          setSession(null);
          setUserRole(undefined);
          setUserData(null);
        } else {
          setUserRole(undefined);
          setUserData(null);
        }
        setAuthError("Error loading user profile");
        setLoading(false);
        setAuthChecked(true);
        setRoleLoaded(true);
        return;
      }

      if (data) {
        console.log("✅ User data loaded:", data);
        const role = data?.role || "client";
        setUserRole(role);
        setUserData(data);
        setAuthError(null);
        console.log("🎯 User role set to:", role);
      } else {
        console.log("⚠️ No profile found");
        setUserRole(undefined);
        setUserData(null);
      }
    } catch (error) {
      console.error("❌ Error in fetchUserData:", error);
      setUserRole(undefined);
      setUserData(null);
      setAuthError(error.message);

      if (fetchRetryCount.current < 2) {
        fetchRetryCount.current++;
        console.log(
          `🔄 Retrying fetchUserData (attempt ${fetchRetryCount.current + 1}/3)...`,
        );
        setTimeout(() => {
          fetchUserData(userId);
        }, 1000);
        return;
      }
    } finally {
      console.log("✅ User data fetch complete");
      setLoading(false);
      setAuthChecked(true);
      setRoleLoaded(true);
    }
  };

  // Timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !authChecked) {
        console.log("⚠️ Loading timeout - forcing completion");
        setAuthChecked(true);
        setLoading(false);
        setRoleLoaded(true);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [loading, authChecked]);

  // Handle initial redirect - ONLY when role is loaded
  useEffect(() => {
    if (loading || !authChecked || !roleLoaded || !maintenanceChecked) {
      console.log("Waiting for role to load...", { loading, authChecked, roleLoaded, userRole, maintenanceChecked });
      return;
    }

    if (session && userRole === undefined) {
      console.log("⚠️ Session exists but role is undefined");
      return;
    }

    const publicPaths = [
      "/login",
      "/",
      "/register",
      "/forgot-password",
      "/about",
      "/contact",
    ];
    
    const currentPath = window.location.pathname;
    
    // MAINTENANCE MODE CHECK
    if (maintenanceMode && session && userRole !== 'admin') {
      console.log("🔧 Maintenance mode active, non-admin access blocked");
      if (currentPath !== '/maintenance') {
        navigate('/maintenance', { replace: true });
      }
      return;
    }
    
    // If maintenance mode is off and user is on maintenance page, redirect
    if (!maintenanceMode && currentPath === '/maintenance') {
      console.log("🔧 Maintenance mode off, redirecting from maintenance page");
      if (session && userRole !== undefined) {
        let destination;
        if (userRole === "owner") {
          destination = "/owner-dashboard";
        } else if (userRole === "admin") {
          destination = "/admin-dashboard";
        } else if (userRole === "client") {
          destination = "/ClientDashboard";
        } else {
          destination = "/";
        }
        navigate(destination, { replace: true });
      } else if (session && userRole === undefined) {
        return;
      } else {
        navigate("/login", { replace: true });
      }
      return;
    }
    
    if (currentPath === '/maintenance' && session && userRole === 'admin') {
      console.log("🔧 Admin accessing during maintenance, redirecting to dashboard");
      const destination = userRole === "owner" ? "/owner-dashboard" : 
                         userRole === "admin" ? "/admin-dashboard" : "/ClientDashboard";
      navigate(destination, { replace: true });
      return;
    }
    
    if (session && userRole !== undefined && publicPaths.includes(currentPath)) {
      if (navigationInProgress.current || initialRedirectDone) {
        return;
      }
      
      navigationInProgress.current = true;
      let destination;
      
      if (userRole === "owner") {
        destination = "/owner-dashboard";
      } else if (userRole === "admin") {
        destination = "/admin-dashboard";
      } else if (userRole === "client") {
        destination = "/ClientDashboard";
      } else {
        destination = "/";
      }
      
      console.log(`🏠 Redirecting from ${currentPath} to ${destination} (role: ${userRole})`);
      navigate(destination, { replace: true });
      setInitialRedirectDone(true);
      setTimeout(() => {
        navigationInProgress.current = false;
      }, 100);
      return;
    }
    
    if (session && userRole !== undefined && !publicPaths.includes(currentPath)) {
      if (currentPath.startsWith("/owner") && userRole !== "owner") {
        console.log("🚫 Owner route blocked for non-owner");
        const destination = userRole === "admin" ? "/admin-dashboard" : 
                           userRole === "client" ? "/ClientDashboard" : "/";
        navigate(destination, { replace: true });
      } else if (currentPath.startsWith("/admin") && userRole !== "admin") {
        console.log("🚫 Admin route blocked for non-admin");
        const destination = userRole === "owner" ? "/owner-dashboard" : 
                           userRole === "client" ? "/ClientDashboard" : "/";
        navigate(destination, { replace: true });
      } else if (currentPath === "/ClientDashboard" && userRole !== "client") {
        console.log("🚫 Client dashboard blocked for non-client");
        const destination = userRole === "admin" ? "/admin-dashboard" : "/owner-dashboard";
        navigate(destination, { replace: true });
      } else if (currentPath === "/browse" && userRole !== "client") {
        console.log("🚫 Browse page blocked for non-client");
        const destination = userRole === "admin" ? "/admin-dashboard" : "/owner-dashboard";
        navigate(destination, { replace: true });
      } else {
        setInitialRedirectDone(true);
      }
    } else if (!session && !publicPaths.includes(currentPath) && currentPath !== '/maintenance') {
      console.log("🔒 No session, redirecting to login");
      navigate("/login", { replace: true });
    } else {
      setInitialRedirectDone(true);
    }
  }, [loading, authChecked, roleLoaded, maintenanceChecked, maintenanceMode, session, userRole, navigate, initialRedirectDone]);

  // Debug logging
  useEffect(() => {
    console.log("📊 App State Update:", {
      loading,
      authChecked,
      roleLoaded,
      maintenanceChecked,
      maintenanceMode,
      session: session?.user?.email,
      userRole,
      path: window.location.pathname,
      initialRedirectDone,
      authError,
    });
  }, [loading, authChecked, roleLoaded, maintenanceChecked, maintenanceMode, session, userRole, initialRedirectDone, authError]);

  if (!authChecked || loading || !roleLoaded || !maintenanceChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100 select-none">
        <div className="text-center select-none">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4 select-none"></div>
          <p className="text-gray-600 font-medium select-none">Loading...</p>
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

  const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    console.log(
      "🛡️ ProtectedRoute - Session:",
      !!session,
      "Role:",
      userRole,
      "AuthChecked:",
      authChecked,
    );

    if (!authChecked || loading || !roleLoaded) {
      return null;
    }

    if (maintenanceMode && userRole !== 'admin') {
      return <Navigate to="/maintenance" replace />;
    }

    if (!session) {
      console.log("🔒 No session, redirecting to login");
      return <Navigate to="/login" replace />;
    }

    if (userRole === undefined) {
      console.log("⚠️ Role undefined, showing loading");
      return null;
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

  const DynamicProfile = () => {
    if (userRole === "owner") {
      return <Navigate to="/owner-profile" replace />;
    }
    return <Profile />;
  };

  return (
    <ThemeProvider>
      <Routes>
        {/* Maintenance Route */}
        <Route path="/maintenance" element={<MaintenancePage />} />
        
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
              <ClientDashboard initialUserData={userData} />
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
          path="/owner-profile"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <OwnerProfile />
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
    </ThemeProvider>
  );
}

export default App;