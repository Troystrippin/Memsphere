import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
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
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Check for email verification success from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
      setVerificationSuccess(true);
      toast.success('Email verified successfully! You can now log in.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setVerificationSuccess(false), 5000);
    }
  }, []);

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

  const handleResendVerification = async () => {
    if (!formData.email) {
      setResendMessage('Please enter your email address first');
      setTimeout(() => setResendMessage(''), 3000);
      return;
    }
    
    setResending(true);
    setResendMessage('');
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`,
        },
      });
      
      if (error) throw error;
      setResendMessage('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Error resending verification:', error);
      setResendMessage('Failed to send verification email. Please try again.');
    } finally {
      setResending(false);
      setTimeout(() => setResendMessage(''), 5000);
    }
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
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });
      
      if (signInError) throw signInError;
      
      // Always check if email is verified (since Supabase always requires email confirmation)
      if (!signInData.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        setError('Please verify your email address before logging in. Check your inbox for the verification link.');
        setLoading(false);
        return;
      }
      
      // Login successful - auth state change listener in App.js will handle navigation
      
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
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100 select-none">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl select-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl select-none"></div>

      <div className="h-full w-full overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="max-w-6xl w-full mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left Side - Branding */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:block select-none"
              >
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      {/* Logo image - made slightly bigger */}
                      <div className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden select-none">
                        <img
                          src={logo}
                          alt="Memsphere Logo"
                          className="w-full h-full object-contain select-none"
                          draggable="false"
                        />
                      </div>
                      <div className="select-none">
                        <h1 className="text-3xl font-bold text-gray-900 select-none">
                          Memsphere
                        </h1>
                        <p className="text-gray-500 text-sm select-none">
                          Membership Management Platform
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-lg select-none">
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
                        className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow select-none"
                      >
                        {/* Updated icon container with centering */}
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-3 select-none`}
                        >
                          <feature.icon className="w-6 h-6 text-white select-none" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1 select-none">
                          {feature.value}
                        </div>
                        <div className="text-xs text-gray-600 select-none">
                          {feature.text}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Benefits List */}
                  <div className="space-y-3 select-none">
                    <p className="text-gray-800 text-sm font-semibold select-none">
                      Why choose Memsphere?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {benefits.map((benefit, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="flex items-center gap-2 select-none"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500 select-none" />
                          <span className="text-sm text-gray-700 font-medium select-none">
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
                className="bg-white rounded-2xl shadow-xl p-8 select-none"
              >
                {/* Header */}
                <div className="text-center mb-8 select-none">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4 select-none">
                    <Sparkles className="w-4 h-4 text-blue-600 select-none" />
                    <span className="text-xs text-blue-600 font-medium select-none">
                      Secure Login
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 select-none">
                    Welcome Back
                  </h2>
                  <p className="text-gray-500 text-sm select-none">
                    Sign in to access your dashboard
                  </p>
                </div>

                {/* Verification Success Alert */}
                <AnimatePresence>
                  {verificationSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 select-none"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 select-none" />
                      <p className="text-sm text-green-600 select-none">
                        Email verified successfully! You can now log in.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Alert */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 select-none"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 select-none" />
                      <p className="text-sm text-red-600 select-none">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Resend Message Alert */}
                {resendMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 p-4 rounded-xl flex items-start gap-3 select-none ${
                      resendMessage.includes('sent') 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}
                  >
                    {resendMessage.includes('sent') ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 select-none" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 select-none" />
                    )}
                    <p className={`text-sm select-none ${
                      resendMessage.includes('sent') ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {resendMessage}
                    </p>
                  </motion.div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Field */}
                  <div className="select-none">
                    <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 select-none" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="example@gmail.com"
                        disabled={loading}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all select-none"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 select-none">
                      Must be a valid Gmail address
                    </p>
                  </div>

                  {/* Password Field */}
                  <div className="select-none">
                    <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 select-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Enter your password"
                        disabled={loading}
                        className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all select-none"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors select-none"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 select-none" />
                        ) : (
                          <Eye className="w-5 h-5 select-none" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end select-none">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors select-none"
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
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed select-none"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin select-none"></div>
                        SIGNING IN...
                      </>
                    ) : (
                      <>
                        SIGN IN
                        <ArrowRight className="w-5 h-5 select-none" />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Resend Verification Link - Only show when there's an email verification error */}
                {error && error.includes('verify') && (
                  <div className="mt-4 text-center select-none">
                    <button
                      onClick={handleResendVerification}
                      disabled={resending}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors select-none"
                    >
                      {resending ? 'Sending...' : 'Resend verification email'}
                    </button>
                  </div>
                )}

                {/* Divider */}
                <div className="relative my-6 select-none">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-gray-500 select-none">
                      New to Memsphere?
                    </span>
                  </div>
                </div>

                {/* Sign Up Link */}
                <div className="text-center select-none">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors group select-none"
                  >
                    Create an account
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform select-none" />
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