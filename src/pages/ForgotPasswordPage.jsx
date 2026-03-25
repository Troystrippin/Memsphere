import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  KeyRound,
  Send,
  RotateCcw,
} from "lucide-react";
import logo from "../assets/logo3.png";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
      setError('Please enter a valid Gmail address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        setError('Email not found in our database');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setError('Please confirm your email first. Check your inbox for confirmation link.');
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      sessionStorage.setItem('resetEmail', email);
      
      setSuccess(`Password reset OTP sent to ${email}! Check your inbox.`);
      setStep(2);
      startResendTimer();
      
    } catch (error) {
      console.error('OTP send error:', error);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const storedEmail = sessionStorage.getItem('resetEmail');
      
      if (!storedEmail) {
        setError('Session expired. Please start over.');
        setStep(1);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email: storedEmail,
        token: otpCode,
        type: 'recovery'
      });

      if (error) {
        if (error.message.includes('expired')) {
          setError('OTP expired. Please request a new one.');
          setOtp(['', '', '', '', '', '']);
        } else if (error.message.includes('Invalid') || error.message.includes('token')) {
          setError('Invalid OTP. Please try again.');
          setOtp(['', '', '', '', '', '']);
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      setSuccess('OTP verified successfully!');
      setStep(3);
      
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      setError('Password must meet all requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      sessionStorage.removeItem('resetEmail');
      
      setSuccess('Password updated successfully!');
      
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login');
      }, 2000);
      
    } catch (error) {
      console.error('Password update error:', error);
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    setError('');

    try {
      const storedEmail = sessionStorage.getItem('resetEmail');
      
      if (!storedEmail) {
        setError('Session expired. Please start over.');
        setStep(1);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(storedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess('New OTP sent!');
      startResendTimer();
      setOtp(['', '', '', '', '', '']);
      
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60); // Changed from 30 to 60 seconds
    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const getDisplayEmail = () => {
    return email || sessionStorage.getItem('resetEmail') || '';
  };

  const features = [
    {
      icon: Shield,
      text: "Secure OTP",
      value: "1 min", // Changed from "30s" to "1 min"
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Send,
      text: "Quick Delivery",
      value: "Instant",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: KeyRound,
      text: "Safe & Encrypted",
      value: "100%",
      color: "from-purple-500 to-pink-500",
    },
  ];

  const benefits = [
    "Secure OTP verification",
    "Quick email delivery",
    "1-minute OTP validity", // Changed from "30-second" to "1-minute"
    "Safe & encrypted",
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
                      {step === 1 && "Reset your password to regain access to your account."}
                      {step === 2 && "Enter the verification code sent to your email."}
                      {step === 3 && "Create a strong new password for your account."}
                    </p>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    {features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-center"
                      >
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mx-auto mb-3`}
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

              {/* Right Side - Form */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-2xl shadow-xl p-8"
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">
                      {step === 1 && "Reset Password"}
                      {step === 2 && "Verify OTP"}
                      {step === 3 && "Create New Password"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {step === 1 && "Forgot Password"}
                    {step === 2 && "Verify OTP"}
                    {step === 3 && "New Password"}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {step === 1 && "Enter your email to receive a verification code"}
                    {step === 2 && `Enter the 6-digit code sent to ${getDisplayEmail()}`}
                    {step === 3 && "Enter your new password below"}
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

                {/* Success Alert */}
                <AnimatePresence>
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <p className="text-sm text-green-600">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 1: Email Form */}
                {step === 1 && (
                  <form onSubmit={handleEmailSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
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
                          SENDING...
                        </>
                      ) : (
                        <>
                          SEND RESET OTP
                          <Send className="w-5 h-5" />
                        </>
                      )}
                    </motion.button>

                    <div className="text-center">
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors group"
                      >
                        <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Back to Login
                      </Link>
                    </div>
                  </form>
                )}

                {/* Step 2: OTP Form */}
                {step === 2 && (
                  <form onSubmit={handleOtpSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter 6-Digit OTP
                      </label>
                      <div className="flex gap-2 justify-center">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            id={`otp-${index}`}
                            type="text"
                            maxLength="1"
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onFocus={() => setFocusedField(`otp-${index}`)}
                            onBlur={() => setFocusedField(null)}
                            disabled={loading}
                            className={`w-12 h-12 text-center text-xl font-bold border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                              focusedField === `otp-${index}` ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        OTP expires in {resendTimer > 0 ? `${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}` : '1:00'}
                      </p>
                    </div>

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
                          VERIFYING...
                        </>
                      ) : (
                        <>
                          VERIFY OTP
                          <CheckCircle className="w-5 h-5" />
                        </>
                      )}
                    </motion.button>

                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendTimer > 0 || loading}
                        className={`text-sm transition-colors ${
                          resendTimer > 0 || loading
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        {resendTimer > 0 ? `Resend in ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}` : 'Resend OTP'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          setOtp(['', '', '', '', '', '']);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        ← Back to Email
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 3: New Password Form */}
                {step === 3 && (
                  <form onSubmit={handlePasswordReset} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          onFocus={() => setFocusedField("newPassword")}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Enter new password"
                          disabled={loading}
                          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('password')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedField("confirmPassword")}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Confirm new password"
                          disabled={loading}
                          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Password must:</p>
                      <ul className="space-y-1 text-xs">
                        <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                          <CheckCircle className={`w-3 h-3 ${newPassword.length >= 8 ? 'text-green-500' : 'text-gray-400'}`} />
                          Be at least 8 characters
                        </li>
                        <li className={`flex items-center gap-2 ${/(?=.*[a-z])/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                          <CheckCircle className={`w-3 h-3 ${/(?=.*[a-z])/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} />
                          Contain lowercase letter
                        </li>
                        <li className={`flex items-center gap-2 ${/(?=.*[A-Z])/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                          <CheckCircle className={`w-3 h-3 ${/(?=.*[A-Z])/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} />
                          Contain uppercase letter
                        </li>
                        <li className={`flex items-center gap-2 ${/(?=.*\d)/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                          <CheckCircle className={`w-3 h-3 ${/(?=.*\d)/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} />
                          Contain number
                        </li>
                        <li className={`flex items-center gap-2 ${/(?=.*[!@#$%^&*])/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                          <CheckCircle className={`w-3 h-3 ${/(?=.*[!@#$%^&*])/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} />
                          Contain special character
                        </li>
                      </ul>
                    </div>

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
                          UPDATING...
                        </>
                      ) : (
                        <>
                          RESET PASSWORD
                          <RotateCcw className="w-5 h-5" />
                        </>
                      )}
                    </motion.button>

                    <div className="text-center">
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors group"
                      >
                        <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Back to Login
                      </Link>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;