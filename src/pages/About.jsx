import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ClientNavbar from '../components/client/ClientNavbar';
import '../styles/About.css';

const About = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const navigate = useNavigate();

  const teamMembers = [
    { id: 1, name: 'Troy Andres', role: 'Lead Developer', avatar: '👨‍💻' },
    { id: 2, name: 'Mandy Lou Barrozo', role: 'UI/UX Designer', avatar: '👩‍🎨' },
    { id: 3, name: 'Danica Caoile', role: 'Backend Engineer', avatar: '👨‍🔧' },
    { id: 4, name: 'Alexa Junio', role: 'Document Specialist', avatar: '👩‍💼' },
    { id: 5, name: 'Kendrick Dela Rosa', role: 'Data Gathering', avatar: '👨‍📊' }
  ];

  const stats = [
    { id: 1, label: 'Founded', value: '2026' },
    { id: 2, label: 'Team', value: 'BSIT2-02, 5 Members' },
    { id: 3, label: 'Businesses', value: '100+' },
    { id: 4, label: 'Users', value: '100+' }
  ];

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);
      await getUserProfile(user);
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/login');
    }
  };

  const getUserProfile = async (user) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      setProfile(profile);

      if (profile?.avatar_url) {
        downloadAvatar(profile.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const downloadAvatar = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
    } catch (error) {
      console.error('Error downloading avatar:', error);
    }
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      const username = user.email.split('@')[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return 'User';
  };

  const firstName = getFirstName();

  return (
    <div className="about-container">
      <ClientNavbar 
        profile={profile}
        avatarUrl={avatarUrl}
      />

      <div className="mobile-welcome">
        <p>Welcome, {firstName}!</p>
      </div>

      <div className="about-main">
        {/* Header */}
        <div className="about-header">
          <h1 className="about-title">About Memsphere</h1>
        </div>

        {/* Mission Text - Restored old style */}
        <div className="mission-text">
          <p className="mission-paragraph">
            We're on a mission to transform how businesses connect with their customers.
          </p>
        </div>

        {/* Stats List - Restored old style with fixed alignment */}
        <div className="stats-list">
          {stats.map(stat => (
            <div key={stat.id} className="stat-item">
              <span className="stat-bullet">•</span>
              <span className="stat-label">{stat.label}:</span>
              <span className="stat-value">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Divider - Restored old style */}
        <hr className="divider" />

        {/* Team Section - Enhanced version */}
        <div className="team-section">
          <h2 className="section-title">Meet Our Team</h2>
          <p className="team-subtitle">BSIT2-02, 5 Members</p>
          
          <div className="team-grid">
            {teamMembers.map(member => (
              <div key={member.id} className="team-card">
                <div className="team-avatar">{member.avatar}</div>
                <h3 className="team-name">{member.name}</h3>
                <p className="team-role">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Divider - Restored old style */}
        <hr className="divider" />

        {/* Get in Touch Section - Restored old style with fixed alignment */}
        <div className="get-in-touch">
          <h2 className="section-title">Get in touch!</h2>
          
          <div className="contact-links">
            <a href="https://t.me/memsphereintg" target="_blank" rel="noopener noreferrer" className="contact-link">
              <span className="link-icon">📱</span>
              <span className="link-text">t.me/memsphereintg</span>
            </a>
            
            <a href="https://instagram.com/memsphere" target="_blank" rel="noopener noreferrer" className="contact-link">
              <span className="link-icon">📷</span>
              <span className="link-text">instagram.com/memsphere</span>
            </a>
            
            <a href="https://facebook.com/memsphere" target="_blank" rel="noopener noreferrer" className="contact-link">
              <span className="link-icon">👍</span>
              <span className="link-text">facebook.com/memsphere</span>
            </a>
            
            <a href="mailto:memsphere26@gmail.com" className="contact-link">
              <span className="link-icon">✉️</span>
              <span className="link-text">memsphere26@gmail.com</span>
            </a>
            
            <a href="tel:+09632514897" className="contact-link">
              <span className="link-icon">📞</span>
              <span className="link-text">09632514897</span>
            </a>
          </div>
        </div>

        {/* Download Section - Restored old style */}
        <div className="download-section">
          <button className="download-btn">
            <span className="btn-text">Download our App now!</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default About;