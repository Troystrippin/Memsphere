import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Users,
  TrendingUp,
  Sparkles,
  Shield,
  Crown,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
// Import your logo
import logo from "../assets/logo3.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const authCheckPerformed = useRef(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    let isMounted = true;

    const checkExistingSession = async () => {
      // Prevent multiple checks
      if (authCheckPerformed.current) return;
      authCheckPerformed.current = true;

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session check error:', sessionError);
          return;
        }

        if (session && isMounted) {
          // User is already logged in, redirect based on role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profile?.role === 'owner') {
            navigate('/owner-dashboard');
          } else if (profile?.role === 'admin') {
            navigate('/admin-dashboard');
          } else {
            navigate('/ClientDashboard');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const validateEmail = (email) => {
    if (!email.trim()) return "Email is required";
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
      return "Must be a valid Gmail address";
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setError(emailError);
      return false;
    }
    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading) return;
    
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      // Sign in with password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please verify your email address before logging in.');
      } else {
        setError(
          "Login failed. Please check your internet connection and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Crown,
      text: "Premium Features",
      value: "Enterprise",
      color: "from-yellow-500 to-orange-500",
    },
    {
      icon: Users,
      text: "Active Businesses",
      value: "500+",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: TrendingUp,
      text: "Happy Members",
      value: "10k+",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Shield,
      text: "Uptime",
      value: "99.9%",
      color: "from-purple-500 to-pink-500",
    },
  ];

  const benefits = [
    "Smart membership tracking",
    "Easy application management",
    "Real-time updates",
    "Secure & reliable",
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

      <div className="h-full w-full overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="max-w-6xl w-full mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left Side - Branding */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:block"
              >
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      {/* Logo image without shadow, background, or effects */}
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden">
                        <img
                          src={logo}
                          alt="Memsphere Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                          Memsphere
                        </h1>
                        <p className="text-gray-500 text-sm">
                          Membership Management Platform
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-lg">
                      Welcome back! Sign in to continue managing your
                      memberships and business.
                    </p>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    {features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* Updated icon container with centering */}
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-3`}
                        >
                          <feature.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {feature.value}
                        </div>
                        <div className="text-xs text-gray-600">
                          {feature.text}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Benefits List */}
                  <div className="space-y-3">
                    <p className="text-gray-800 text-sm font-semibold">
                      Why choose Memsphere?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {benefits.map((benefit, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700 font-medium">
                            {benefit}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right Side - Login Form */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-2xl shadow-xl p-8"
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">
                      Secure Login
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Sign in to access your dashboard
                  </p>
                </div>

                {/* Error Alert */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="example@gmail.com"
                        disabled={loading}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Must be a valid Gmail address
                    </p>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Enter your password"
                        disabled={loading}
                        className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  {/* Login Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        SIGNING IN...
                      </>
                    ) : (
                      <>
                        SIGN IN
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-gray-500">
                      New to Memsphere?
                    </span>
                  </div>
                </div>

                {/* Sign Up Link */}
                <div className="text-center">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors group"
                  >
                    Create an account
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
