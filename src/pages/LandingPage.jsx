import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Building,
  Shield,
  RefreshCw,
  DollarSign,
  BarChart3,
  Bell,
  Lock,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Clock,
  FileText,
  Settings,
  Rocket
} from 'lucide-react';
import logo from "../assets/logo3.png";

const LandingPage = () => {
  const navigate = useNavigate();

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white select-none">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => navigate('/')}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                <img src={logo} alt="Memsphere Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent select-none">
                Memsphere
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors select-none">Features</a>
              <a href="#about" className="text-gray-600 hover:text-blue-600 transition-colors select-none">About</a>
              <button 
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors select-none"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
              <button 
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-all shadow-md hover:shadow-lg select-none"
                onClick={() => navigate('/register')}
              >
                Get Started
              </button>
            </div>
            
            <button className="md:hidden p-2 select-none">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Full Width */}
      <section className="w-full pt-24 md:pt-32 pb-16 md:pb-24 overflow-hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div {...fadeInUp}>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full mb-6 select-none">
                  <Rocket className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium select-none">For Membership-Based Businesses</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight select-none">
                  Smart Membership{' '}
                  <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    Management
                  </span>{' '}
                  System
                </h1>
                <p className="text-xl text-gray-600 mb-4 select-none">
                  Simplify member tracking, renewals, and payments—all in one place
                </p>
                <p className="text-gray-500 mb-8 select-none">
                  From gyms and clubs to co-working spaces and subscription services, 
                  Memsphere helps you manage memberships effortlessly while you focus on growing your business.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 select-none"
                    onClick={() => navigate('/register')}
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
                
                <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-gray-200">
                  <div className="text-center select-none">
                    <div className="text-2xl font-bold text-blue-600">500+</div>
                    <div className="text-sm text-gray-500">Businesses</div>
                  </div>
                  <div className="text-center select-none">
                    <div className="text-2xl font-bold text-blue-600">50K+</div>
                    <div className="text-sm text-gray-500">Active Members</div>
                  </div>
                  <div className="text-center select-none">
                    <div className="text-2xl font-bold text-blue-600">98%</div>
                    <div className="text-sm text-gray-500">Retention Rate</div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-1 shadow-2xl">
                  <div className="bg-white rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800 select-none">Dashboard Overview</h3>
                        <span className="text-xs text-blue-600 select-none">Today</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <Users className="w-5 h-5 text-blue-600 mb-2" />
                          <div className="text-xl font-bold text-gray-800 select-none">156</div>
                          <div className="text-xs text-gray-500 select-none">Total Members</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <Clock className="w-5 h-5 text-yellow-600 mb-2" />
                          <div className="text-xl font-bold text-gray-800 select-none">12</div>
                          <div className="text-xs text-gray-500 select-none">Pending Renewals</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <FileText className="w-5 h-5 text-green-600 mb-2" />
                          <div className="text-xl font-bold text-gray-800 select-none">8</div>
                          <div className="text-xs text-gray-500 select-none">New Applications</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <DollarSign className="w-5 h-5 text-purple-600 mb-2" />
                          <div className="text-xl font-bold text-gray-800 select-none">$12.5K</div>
                          <div className="text-xs text-gray-500 select-none">Monthly Revenue</div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 select-none">Recent Applications</span>
                          <span className="text-blue-600 select-none">View All</span>
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between py-2">
                            <div>
                              <p className="text-sm font-medium text-gray-800 select-none">Troy Andres</p>
                              <p className="text-xs text-gray-500 select-none">Premium Plan</p>
                            </div>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-600 text-xs rounded-full select-none">Pending</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <div>
                              <p className="text-sm font-medium text-gray-800 select-none">Mandy Lou</p>
                              <p className="text-xs text-gray-500 select-none">Basic Plan</p>
                            </div>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-600 text-xs rounded-full select-none">Pending</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-200 rounded-full blur-2xl opacity-50 -z-10"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-300 rounded-full blur-2xl opacity-50 -z-10"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* User Personas Section - Full Width */}
      <section className="w-full py-16 bg-white">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 select-none">Designed for Everyone</h2>
              <p className="text-xl text-gray-600 select-none">Three powerful portals, one integrated platform</p>
            </motion.div>
            
            <motion.div variants={staggerChildren} initial="initial" animate="animate" className="grid md:grid-cols-3 gap-8">
              <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3 select-none">Members</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Browse businesses & membership plans</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Apply for membership</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Track membership status</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> View expiration dates</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Receive announcements</li>
                </ul>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-xl hover:shadow-2xl transition-all p-6 border border-blue-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200 rounded-full blur-2xl opacity-50"></div>
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 relative">
                  <Building className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3 select-none">Business Owners</h3>
                <ul className="space-y-2 text-gray-600 relative">
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Manage membership applications</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Track member lists & renewals</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Create membership plans</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Send announcements</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> View revenue reports</li>
                </ul>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3 select-none">System Admins</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Approve business owners</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Manage platform access</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Monitor all businesses</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Control user roles</li>
                  <li className="flex items-center gap-2 select-none"><CheckCircle className="w-4 h-4 text-green-500" /> Platform oversight</li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - Full Width */}
      <section id="features" className="w-full py-16 bg-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 select-none">Powerful Membership Features</h2>
              <p className="text-xl text-gray-600 select-none">Everything you need to run a successful membership business</p>
            </motion.div>
            
            <motion.div variants={staggerChildren} initial="initial" animate="animate" className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: FileText, title: "Application Management", desc: "Streamlined membership applications with approval workflows", color: "text-blue-600", bg: "bg-blue-100" },
                { icon: RefreshCw, title: "Renewal Tracking", desc: "Automated reminders for upcoming membership renewals", color: "text-green-600", bg: "bg-green-100" },
                { icon: DollarSign, title: "Payment Tracking", desc: "Mark payments as received and track monthly revenue", color: "text-purple-600", bg: "bg-purple-100" },
                { icon: BarChart3, title: "Member Analytics", desc: "Insights into active members, pending renewals, and growth", color: "text-orange-600", bg: "bg-orange-100" },
                { icon: Bell, title: "Announcements", desc: "Send messages and updates to your members instantly", color: "text-pink-600", bg: "bg-pink-100" },
                { icon: Lock, title: "Role-Based Access", desc: "Secure access controls for admins, owners, and members", color: "text-indigo-600", bg: "bg-indigo-100" }
              ].map((feature, index) => (
                <motion.div key={index} variants={fadeInUp} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100">
                  <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 select-none">{feature.title}</h3>
                  <p className="text-gray-600 select-none">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works - Full Width */}
      <section className="w-full py-16 bg-white">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 select-none">Simple 3-Step Process</h2>
              <p className="text-xl text-gray-600 select-none">Get started with Memsphere in minutes</p>
            </motion.div>
            
            <motion.div variants={staggerChildren} initial="initial" animate="animate" className="grid md:grid-cols-3 gap-8">
              {[
                { number: "1", title: "Sign Up", desc: "Create your account as a business owner or member" },
                { number: "2", title: "Set Up", desc: "Configure your membership plans and preferences" },
                { number: "3", title: "Start Managing", desc: "Accept applications and grow your membership base" }
              ].map((step, index) => (
                <motion.div key={index} variants={fadeInUp} className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl font-bold text-white select-none">{step.number}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 select-none">{step.title}</h3>
                  <p className="text-gray-600 select-none">{step.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer - Full Width */}
      <footer className="w-full bg-gray-900 text-white py-12">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                    <img src={logo} alt="Memsphere Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xl font-bold text-white select-none">Memsphere</span>
                </div>
                <p className="text-gray-400 mb-4 select-none">Smart Membership Management</p>
                <p className="text-gray-500 text-sm select-none">© 2024 Memsphere. All rights reserved.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-4 select-none">Product</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#features" className="hover:text-white transition-colors select-none">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors select-none">FAQ</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 select-none">Company</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors select-none">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors select-none">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 select-none">Legal</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors select-none">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors select-none">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white transition-colors select-none">Security</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;