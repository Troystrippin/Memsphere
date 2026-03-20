import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ClientNavbar from '../components/client/ClientNavbar';
import '../styles/Contact.css';
import {
  Mail,
  Phone,
  Instagram,
  Facebook,
  Send,
  Download,
  ChevronRight,
  MapPin,
  Globe,
  Clock,
  MessageCircle,
  Heart,
  Sparkles,
  Users,
  Award
} from 'lucide-react';

const Contact = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const navigate = useNavigate();

  const contactInfo = [
    { 
      id: 1, 
      platform: 'Email', 
      value: 'memsphere26@gmail.com', 
      icon: Mail, 
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      link: 'mailto:memsphere26@gmail.com'
    },
    { 
      id: 2, 
      platform: 'Phone', 
      value: '0963 251 4897', 
      icon: Phone, 
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600',
      link: 'tel:+09632514897'
    },
    { 
      id: 3, 
      platform: 'Telegram', 
      value: '@memsphereintg', 
      icon: Send, 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      link: 'https://t.me/memsphereintg'
    },
    { 
      id: 4, 
      platform: 'Instagram', 
      value: '@memsphere', 
      icon: Instagram, 
      color: 'from-pink-500 to-purple-600',
      bgColor: 'bg-pink-100',
      textColor: 'text-pink-600',
      link: 'https://instagram.com/memsphere'
    },
    { 
      id: 5, 
      platform: 'Facebook', 
      value: '/memsphere', 
      icon: Facebook, 
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      link: 'https://facebook.com/memsphere'
    },
    { 
      id: 6, 
      platform: 'Location', 
      value: 'Philippines', 
      icon: MapPin, 
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
      link: '#'
    }
  ];

  const faqs = [
    {
      id: 1,
      question: 'How can I become a member?',
      answer: 'Simply browse through our businesses, select a membership plan that suits you, and complete the payment process. Your membership will be activated upon approval.'
    },
    {
      id: 2,
      question: 'What payment methods do you accept?',
      answer: 'We accept GCash payments and on-site payments at the business premises. For GCash, you can upload your payment receipt directly on our platform.'
    },
    {
      id: 3,
      question: 'How long does membership approval take?',
      answer: 'For GCash payments, approval typically takes 24-48 hours. For on-site payments, your membership is activated immediately upon payment at the business.'
    },
    {
      id: 4,
      question: 'Can I cancel my membership?',
      answer: 'Yes, you can cancel your membership at any time. Please contact the business owner directly for cancellation requests and refund policies.'
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <ClientNavbar 
        profile={profile}
        avatarUrl={avatarUrl}
      />

      {/* Mobile Welcome */}
      <div className="md:hidden bg-white border-b border-gray-200 px-6 py-3 text-gray-600 text-sm">
        <p>Welcome, {firstName}!</p>
      </div>

      {/* Hero Section - Enhanced with Blue Background and Better Spacing */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 pt-32 pb-24 px-4 -mt-1">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent"></div>
          
          {/* Animated blobs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          
          {/* Geometric patterns */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          {/* Grid pattern */}
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
        <div className="relative max-w-4xl mx-auto text-center text-white z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-8 animate-fadeIn">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>Connect With Us</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fadeIn">
            Get in <span className="bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">Touch</span>
          </h1>
          
          <p className="hero-subtitle text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed mb-8 animate-fadeIn animation-delay-200">
            We'd love to hear from you! Reach out through any of our channels.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 animate-fadeIn animation-delay-400">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm flex items-center gap-2">
              <span>💬</span>
              <span>24/7 Support</span>
            </div>
            <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm flex items-center gap-2">
              <span>⚡</span>
              <span>Fast Response</span>
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

      {/* Contact Grid - Increased top margin for better spacing */}
      <div className="max-w-6xl mx-auto px-4 py-20 mt-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4">
            Connect With Us
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Reach Out Anytime
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose your preferred way to connect with us. We're always here to help!
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contactInfo.map(info => {
            const Icon = info.icon;
            return (
              <a
                key={info.id}
                href={info.link}
                target={info.link !== '#' ? '_blank' : undefined}
                rel={info.link !== '#' ? 'noopener noreferrer' : undefined}
                className="contact-card group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${info.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className={`w-16 h-16 ${info.bgColor} rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/20 group-hover:backdrop-blur-sm transition-all duration-300`}>
                    <Icon className={`w-8 h-8 ${info.textColor} group-hover:text-white transition-colors duration-300`} />
                  </div>
                  <h3 className={`text-lg font-semibold text-gray-900 mb-1 group-hover:text-white transition-colors duration-300`}>
                    {info.platform}
                  </h3>
                  <p className={`text-gray-600 group-hover:text-white/90 transition-colors duration-300`}>
                    {info.value}
                  </p>
                </div>

                {/* Arrow icon */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-purple-100 text-purple-600 rounded-full text-sm font-semibold mb-4">
              Frequently Asked Questions
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Got Questions?
            </h2>
            <p className="text-xl text-gray-600">
              We've got answers to the most common questions
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map(faq => (
              <div key={faq.id} className="faq-card bg-white rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Download App Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20 px-4">
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

export default Contact;