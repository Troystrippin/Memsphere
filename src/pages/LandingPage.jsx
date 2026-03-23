import React from "react";
import "../styles/LandingPage.css";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-logo">
          <span className="logo-icon">⚡</span>
          MEMSPHERE
        </div>
        <ul className="nav-menu">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#about">About</a>
          </li>
          <li>
            <button className="btn-outline" onClick={() => navigate("/login")}>
              Sign In
            </button>
          </li>
          <li>
            <button
              className="btn-primary"
              onClick={() => navigate("/register")}
            >
              Get Started
            </button>
          </li>
        </ul>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🚀 For Membership-Based Businesses</div>
          <h1 className="hero-title">
            Smart Membership <span className="gradient-text">Management</span>{" "}
            System
          </h1>
          <p className="hero-subtitle">
            Simplify member tracking, renewals, and payments—all in one place
          </p>
          <p className="hero-description">
            From gyms and clubs to co-working spaces and subscription services,
            Memsphere helps you manage memberships effortlessly while you focus
            on growing your business.
          </p>
          <div className="hero-content-buttons">
            <button
              className="btn-primary btn-large"
              onClick={() => navigate("/register")}
            >
              Get Started
            </button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-highlight">500+</span>
              <span>Businesses</span>
            </div>
            <div className="hero-stat">
              <span className="stat-highlight">50K+</span>
              <span>Active Members</span>
            </div>
            <div className="hero-stat">
              <span className="stat-highlight">98%</span>
              <span>Retention Rate</span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <div className="dashboard-preview">
            <div className="preview-card">
              <div className="preview-header">
                <span className="preview-dot"></span>
                <span className="preview-dot"></span>
                <span className="preview-dot"></span>
              </div>
              <div className="preview-content">
                <div className="preview-row"></div>
                <div className="preview-row"></div>
                <div className="preview-row"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Personas Section */}
      <section className="personas">
        <h2 className="section-title">Designed for Everyone</h2>
        <p className="section-subtitle">
          Three powerful portals, one integrated platform
        </p>

        <div className="personas-grid">
          <div className="persona-card">
            <div className="persona-icon">👤</div>
            <h3>Members</h3>
            <ul className="persona-features">
              <li>✓ Browse businesses & membership plans</li>
              <li>✓ Apply for membership</li>
              <li>✓ Track membership status</li>
              <li>✓ View expiration dates</li>
              <li>✓ Receive announcements</li>
            </ul>
          </div>

          <div className="persona-card featured">
            <div className="persona-icon">💼</div>
            <h3>Business Owners</h3>
            <ul className="persona-features">
              <li>✓ Manage membership applications</li>
              <li>✓ Track member lists & renewals</li>
              <li>✓ Create membership plans</li>
              <li>✓ Send announcements</li>
              <li>✓ View revenue reports</li>
            </ul>
          </div>

          <div className="persona-card">
            <div className="persona-icon">⚙️</div>
            <h3>System Admins</h3>
            <ul className="persona-features">
              <li>✓ Approve business owners</li>
              <li>✓ Manage platform access</li>
              <li>✓ Monitor all businesses</li>
              <li>✓ Control user roles</li>
              <li>✓ Platform oversight</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <h2 className="section-title">Powerful Membership Features</h2>
        <p className="section-subtitle">
          Everything you need to run a successful membership business
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3>Application Management</h3>
            <p>Streamlined membership applications with approval workflows</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Renewal Tracking</h3>
            <p>Automated reminders for upcoming membership renewals</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Payment Tracking</h3>
            <p>Mark payments as received and track monthly revenue</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Member Analytics</h3>
            <p>Insights into active members, pending renewals, and growth</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📢</div>
            <h3>Announcements</h3>
            <p>Send messages and updates to your members instantly</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>Role-Based Access</h3>
            <p>Secure access controls for admins, owners, and members</p>
          </div>
        </div>
      </section>

      {/* Business Owner Dashboard Preview */}
      <section className="dashboard-preview-section">
        <div className="dashboard-container">
          <div className="dashboard-content">
            <h2>Complete Business Control</h2>
            <p>
              See exactly what's happening with your memberships at a glance
            </p>

            <div className="dashboard-stats-grid">
              <div className="dashboard-stat-item">
                <div className="stat-icon">👥</div>
                <div>
                  <h4>156</h4>
                  <p>Total Members</p>
                </div>
              </div>
              <div className="dashboard-stat-item">
                <div className="stat-icon">⏳</div>
                <div>
                  <h4>12</h4>
                  <p>Pending Renewals</p>
                </div>
              </div>
              <div className="dashboard-stat-item">
                <div className="stat-icon">📝</div>
                <div>
                  <h4>8</h4>
                  <p>New Applications</p>
                </div>
              </div>
              <div className="dashboard-stat-item">
                <div className="stat-icon">💰</div>
                <div>
                  <h4>$12.5K</h4>
                  <p>Monthly Revenue</p>
                </div>
              </div>
            </div>

            <div className="application-list">
              <h4>Recent Applications</h4>
              <div className="application-item">
                <span>Troy Andres</span>
                <span>Premium Plan</span>
                <span className="status pending">Pending</span>
                <div className="action-buttons">
                  <button className="action-btn approve">✓</button>
                  <button className="action-btn reject">✗</button>
                </div>
              </div>
              <div className="application-item">
                <span>Mandy Lou</span>
                <span>Basic Plan</span>
                <span className="status pending">Pending</span>
                <div className="action-buttons">
                  <button className="action-btn approve">✓</button>
                  <button className="action-btn reject">✗</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2 className="section-title">Simple 3-Step Process</h2>
        <p className="section-subtitle">
          Get started with Memsphere in minutes
        </p>

        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Sign Up</h3>
            <p>Create your account as a business owner or member</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Set Up</h3>
            <p>Configure your membership plans and preferences</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Start Managing</h3>
            <p>Accept applications and grow your membership base</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>MEMSPHERE</h4>
            <p>Smart Membership Management</p>
            <p className="footer-address">
              © 2024 Memsphere. All rights reserved.
            </p>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#faq">FAQ</a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <ul>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <a href="#contact">Contact</a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li>
                <a href="#privacy">Privacy</a>
              </li>
              <li>
                <a href="#terms">Terms</a>
              </li>
              <li>
                <a href="#security">Security</a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
