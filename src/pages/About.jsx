import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ClientNavbar from '../components/client/ClientNavbar';
import '../styles/About.css';
import {
  Users,
  Award,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Send,
  Download,
  ChevronRight,
  Star,
  Sparkles,
  Heart,
  Shield,
  Zap,
  Globe,
  Clock,
  Building2,
  UserCheck,
  TrendingUp,
  Linkedin,
  Twitter
} from 'lucide-react';

const About = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [businessCount, setBusinessCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const teamMembers = [
    { id: 1, name: 'Troy Andres', role: 'Lead Developer', avatar: '👨‍💻', bio: 'Full-stack developer with passion for creating seamless user experiences', social: { linkedin: '#', twitter: '#', github: '#' } },
    { id: 2, name: 'Mandy Lou Barrozo', role: 'UI/UX Designer', avatar: '👩‍🎨', bio: 'Designing intuitive and beautiful interfaces that users love', social: { linkedin: '#', twitter: '#', github: '#' } },
    { id: 3, name: 'Danica Caoile', role: 'Backend Engineer', avatar: '👨‍🔧', bio: 'Building robust and scalable server architecture', social: { linkedin: '#', twitter: '#', github: '#' } },
    { id: 4, name: 'Alexa Junio', role: 'Document Specialist', avatar: '👩‍💼', bio: 'Ensuring technical excellence through comprehensive documentation', social: { linkedin: '#', twitter: '#', github: '#' } },
    { id: 5, name: 'Kendrick Dela Rosa', role: 'Data Gathering', avatar: '👨‍📊', bio: 'Collecting and analyzing valuable insights for better decisions', social: { linkedin: '#', twitter: '#', github: '#' } }
  ];

  const stats = [
    { id: 1, label: 'Founded', value: '2026', icon: Clock, color: 'blue' },
    { id: 2, label: 'Team Size', value: '5', icon: Users, color: 'purple' },
    { id: 3, label: 'Businesses', value: businessCount, icon: Building2, color: 'green' },
    { id: 4, label: 'Active Users', value: userCount, icon: UserCheck, color: 'orange' }
  ];

  const values = [
    { id: 1, title: 'Innovation', description: 'Pushing boundaries to create meaningful solutions', icon: Zap },
    { id: 2, title: 'Community', description: 'Building connections that matter', icon: Heart },
    { id: 3, title: 'Excellence', description: 'Delivering quality in everything we do', icon: Award },
    { id: 4, title: 'Trust', description: 'Fostering reliable and secure partnerships', icon: Shield }
  ];

  useEffect(() => {
    checkUser();
    fetchStats();
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
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('verification_status', 'approved');

      if (!bizError) setBusinessCount(businesses || 0);

      const { count: users, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (!userError) setUserCount(users || 0);

      const { count: members, error: memberError } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      if (!memberError) setMemberCount(members || 0);

    } catch (error) {
      console.error('Error fetching stats:', error);
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
    if (profile?.first_name) return profile.first_name;
    if (user?.email) {
      const username = user.email.split('@')[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return 'User';
  };

  const firstName = getFirstName();

  const getStatClass = (color) => {
    const classes = {
      blue: 'stat-blue',
      purple: 'stat-purple',
      green: 'stat-green',
      orange: 'stat-orange'
    };
    return classes[color] || 'stat-blue';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading amazing content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <ClientNavbar profile={profile} avatarUrl={avatarUrl} />

      {/* Mobile Welcome */}
      <div className="md:hidden bg-white border-b border-gray-200 px-6 py-3 text-gray-600 text-sm">
        <p>Welcome, {firstName}!</p>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 pt-32 pb-40 px-4 -mt-1">
        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent"></div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <svg className="absolute inset-0 w-full h-full opacity-5">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-white rounded-full animate-ping opacity-30"></div>
        <div className="absolute top-3/4 right-1/4 w-4 h-4 bg-white rounded-full animate-ping opacity-30 animation-delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-6 h-6 bg-blue-300 rounded-full animate-pulse opacity-20"></div>

        {/* Main content */}
        <div className="relative max-w-6xl mx-auto text-center text-white z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-8 animate-fadeIn">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>Welcome to Memsphere</span>
          </div>

          <h1 className="hero-title text-6xl md:text-7xl font-bold mb-6 animate-fadeIn">
            About{' '}
            <span className="bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
              Memsphere
            </span>
          </h1>

          <p className="hero-subtitle text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed mb-10 animate-fadeIn animation-delay-200">
            We're on a mission to transform how businesses connect with their customers, 
            creating meaningful relationships that drive growth and foster community.
          </p>

          {/* Stats badges */}
          <div className="flex flex-wrap justify-center gap-4 animate-fadeIn animation-delay-400">
            {[
              { emoji: '🚀', text: 'Since 2026' },
              { emoji: '👥', text: `${userCount.toLocaleString()}+ Users` },
              { emoji: '🏢', text: `${businessCount.toLocaleString()}+ Businesses` },
              { emoji: '⭐', text: '4.8 Rating' }
            ].map((badge, idx) => (
              <div key={idx} className="group relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-lg group-hover:blur-xl transition-all"></div>
                <div className="relative px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2 hover:bg-white/20 transition-all">
                  <span className="text-2xl">{badge.emoji}</span>
                  <span className="text-sm font-medium">{badge.text}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-[-80px] left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-scroll"></div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="w-full h-auto">
            <path fill="white" fillOpacity="1" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
          </svg>
        </div>
      </div>

      {/* Stats Cards - Enhanced */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="stats-grid">
          {stats.map(stat => {
            const Icon = stat.icon;
            const statClass = getStatClass(stat.color);
            return (
              <div key={stat.id} className={`stat-card-enhanced ${statClass}`}>
                <div className="stat-icon">
                  <Icon size={28} />
                </div>
                <div className="stat-value">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
                <div className="stat-label">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mission Statement - With white text */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4">
            Our Mission
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Connecting Businesses & Communities
          </h2>
          <p className="mission-text text-xl text-gray-600 leading-relaxed">
            Memsphere is more than just a platform – it's a community where businesses thrive 
            and customers find exactly what they're looking for. We believe in creating 
            meaningful connections that drive growth and foster lasting relationships.
          </p>
        </div>

        {/* Values Grid */}
        <div className="values-grid">
          {values.map(value => {
            const Icon = value.icon;
            return (
              <div key={value.id} className="value-card-enhanced">
                <div className="value-icon">
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="value-title">{value.title}</h3>
                <p className="value-description">{value.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Section - Horizontal Layout */}
      <div className="team-container">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-purple-100 text-purple-600 rounded-full text-sm font-semibold mb-4">
            The Team
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Meet Our Team
          </h2>
          <p className="text-xl text-gray-600">
            BSIT2-02 | 5 Passionate Members
          </p>
        </div>

        {/* Horizontal Team Grid */}
        <div className="team-grid-horizontal">
          {teamMembers.map(member => (
            <div key={member.id} className="team-card-enhanced">
              <div className="team-avatar-enhanced">
                {member.avatar}
              </div>
              <h3 className="team-name-enhanced">{member.name}</h3>
              <p className="team-role-enhanced">{member.role}</p>
              <p className="team-bio-enhanced">{member.bio}</p>
              
              {/* Social Links */}
              <div className="team-social">
                <div className="team-social-link">
                  <Linkedin size={16} />
                </div>
                <div className="team-social-link">
                  <Twitter size={16} />
                </div>
                <div className="team-social-link">
                  <Mail size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Download App Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20 px-4 mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-6 text-yellow-400 animate-pulse" />
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get the Memsphere App
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Download our mobile app for a better experience! Browse businesses, manage memberships, and connect on the go.
          </p>
          <button className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl">
            <Download size={24} />
            <span>Download the App</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <p>© 2026 Memsphere. All rights reserved.</p>
          <p className="text-sm mt-2">Built with ❤️ by BSIT2-02</p>
        </div>
      </footer>
    </div>
  );
};

export default About;