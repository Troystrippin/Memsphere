import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/ForgotPasswordPage.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: OTP, Step 3: New Password
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

  // Handle email submission - Send password reset OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // Optional: Remove if you want to allow any email domain
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
      setError('Please enter a valid Gmail address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // First, check if user exists in your profiles table
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

      // IMPORTANT: Use resetPasswordForEmail for password reset
      // This will send an OTP if your email template uses {{ .Token }}
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

      // Store email for OTP verification step
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

  // Handle OTP verification
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

      // IMPORTANT: For password reset, we need to verify the OTP
      // This will create a session that allows password update
      const { data, error } = await supabase.auth.verifyOtp({
        email: storedEmail,
        token: otpCode,
        type: 'recovery' // Use 'recovery' for password reset
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

      // OTP verified successfully
      setSuccess('OTP verified successfully!');
      setStep(3);
      
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    // Validate password
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
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Clear stored data
      sessionStorage.removeItem('resetEmail');
      
      setSuccess('Password updated successfully!');
      
      // Sign out and redirect to login
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

  // Resend OTP
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

      // Use resetPasswordForEmail for resending
      const { error } = await supabase.auth.resetPasswordForEmail(storedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess('New OTP sent!');
      startResendTimer();
      
      // Clear OTP inputs for fresh entry
      setOtp(['', '', '', '', '', '']);
      
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(30);
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

  // Get display email for OTP step
  const getDisplayEmail = () => {
    return email || sessionStorage.getItem('resetEmail') || '';
  };

  return (
    <div className="forgot-password-container">
      {/* Left Side - Branding */}
      <div className="forgot-password-brand">
        <div className="brand-content">
          <div className="brand-title">
            <span className="logo-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="2" fill="white"/>
              </svg>
            </span>
            <span>Memsphere</span>
          </div>
          <h2>Reset Password</h2>
          <p>We'll help you recover access to your account</p>
          
          <div className="brand-features">
            <div className="brand-feature">
              <span className="feature-icon">✓</span>
              <span className="feature-text">Secure OTP verification</span>
            </div>
            <div className="brand-feature">
              <span className="feature-icon">✓</span>
              <span className="feature-text">Quick email delivery</span>
            </div>
            <div className="brand-feature">
              <span className="feature-icon">✓</span>
              <span className="feature-text">30-second OTP validity</span>
            </div>
            <div className="brand-feature">
              <span className="feature-icon">✓</span>
              <span className="feature-text">Safe & encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="forgot-password-form-container">
        <div className="app-header">
          <div className="logo-container">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#00b4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#00b4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#00b4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="2" fill="#00b4ff"/>
            </svg>
            <h1 className="logo">Memsphere</h1>
          </div>
          <h2 className="forgot-password-title">
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Verify OTP'}
            {step === 3 && 'Create New Password'}
          </h2>
          <p className="forgot-password-subtitle">
            {step === 1 && 'Enter your email to receive a verification code'}
            {step === 2 && `Enter the 6-digit code sent to ${getDisplayEmail()}`}
            {step === 3 && 'Enter your new password below'}
          </p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <span className="success-icon">✓</span>
            {success}
          </div>
        )}

        {/* Step 1: Email Form */}
        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="forgot-password-form">
            <div className="input-group">
              <label>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="example@gmail.com"
                disabled={loading}
                className={focusedField === 'email' ? 'focused' : ''}
              />
            </div>

            <button 
              type="submit" 
              className="forgot-password-btn"
              disabled={loading}
            >
              {loading ? 'SENDING...' : 'SEND RESET OTP'}
            </button>

            <div className="back-to-login">
              <Link to="/login">← Back to Login</Link>
            </div>
          </form>
        )}

        {/* Step 2: OTP Form */}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit} className="forgot-password-form">
            <div className="otp-input-group">
              <label>ENTER 6-DIGIT OTP</label>
              <div className="otp-container">
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
                    className={`otp-input ${focusedField === `otp-${index}` ? 'focused' : ''}`}
                    disabled={loading}
                  />
                ))}
              </div>
              <p className="otp-hint">OTP expires in 30 seconds</p>
            </div>

            <button 
              type="submit" 
              className="forgot-password-btn"
              disabled={loading}
            >
              {loading ? 'VERIFYING...' : 'VERIFY OTP'}
            </button>

            <div className="resend-otp">
              <button 
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || loading}
                className="resend-btn"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>

            <div className="back-to-login">
              <button 
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp(['', '', '', '', '', '']);
                }}
                className="back-btn"
              >
                ← Back to Email
              </button>
            </div>
          </form>
        )}

        {/* Step 3: New Password Form */}
        {step === 3 && (
          <form onSubmit={handlePasswordReset} className="forgot-password-form">
            <div className="input-group">
              <label>NEW PASSWORD</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={() => setFocusedField('newPassword')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  disabled={loading}
                  className={focusedField === 'newPassword' ? 'focused' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('password')}
                  tabIndex="-1"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>CONFIRM PASSWORD</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  disabled={loading}
                  className={focusedField === 'confirmPassword' ? 'focused' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('confirm')}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="password-requirements">
              <p className="requirements-title">Password must:</p>
              <ul className="requirements-list">
                <li className={newPassword.length >= 8 ? 'met' : ''}>✓ Be at least 8 characters</li>
                <li className={/(?=.*[a-z])/.test(newPassword) ? 'met' : ''}>✓ Contain lowercase letter</li>
                <li className={/(?=.*[A-Z])/.test(newPassword) ? 'met' : ''}>✓ Contain uppercase letter</li>
                <li className={/(?=.*\d)/.test(newPassword) ? 'met' : ''}>✓ Contain number</li>
                <li className={/(?=.*[!@#$%^&*])/.test(newPassword) ? 'met' : ''}>✓ Contain special character</li>
              </ul>
            </div>

            <button 
              type="submit" 
              className="forgot-password-btn"
              disabled={loading}
            >
              {loading ? 'UPDATING...' : 'RESET PASSWORD'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;