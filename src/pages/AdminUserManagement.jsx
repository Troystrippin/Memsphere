import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminSidebarNav from '../components/admin/AdminSidebarNav';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  X,
  Mail,
  Phone,
  Calendar,
  Crown,
  Shield,
  User,
  AlertCircle,
  Trash2,
  Archive,
  CheckCircle,
  Download,
  Eye,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    clients: 0,
    owners: 0,
    admins: 0,
    archived: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      const clients = users.filter(u => u.role === 'client' && u.status !== 'archived').length;
      const owners = users.filter(u => u.role === 'owner' && u.status !== 'archived').length;
      const admins = users.filter(u => u.role === 'admin' && u.status !== 'archived').length;
      const archived = users.filter(u => u.status === 'archived').length;
      setStats({
        total: users.filter(u => u.status !== 'archived').length,
        clients,
        owners,
        admins,
        archived
      });
    }
  }, [users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const processedData = data.map(user => ({
        ...user,
        status: user.status || 'active',
        role: user.role || 'client',
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'
      }));

      setUsers(processedData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const exportData = filteredUsers.map(user => ({
      'ID': user.id,
      'Full Name': `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      'Email': user.email,
      'Mobile': user.mobile || 'N/A',
      'Role': user.role,
      'Status': user.status,
      'Joined Date': new Date(user.created_at).toLocaleDateString(),
      'Archived Date': user.archived_at ? new Date(user.archived_at).toLocaleDateString() : 'N/A'
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header];
          const escaped = String(value).replace(/"/g, '""');
          return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
        }).join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleArchiveClick = (user) => {
    setSelectedUser(user);
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setUsers(prevUsers => prevUsers.map(user => 
        user.id === selectedUser.id 
          ? { ...user, status: 'archived', archived_at: new Date().toISOString() } 
          : user
      ));
      
      setShowArchiveModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error archiving user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      setUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUser.id));
      
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnarchiveUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          archived_at: null
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId 
          ? { ...user, status: 'active', archived_at: null } 
          : user
      ));
      
    } catch (error) {
      console.error('Error restoring user:', error);
    }
  };

  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return '??';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'archived') {
      return (
        <div className="flex justify-center">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1 select-none">
            <Archive className="w-3 h-3" /> Archived
          </span>
        </div>
      );
    }
    return (
      <div className="flex justify-center">
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600 flex items-center gap-1 select-none">
          <CheckCircle className="w-3 h-3" /> Active
        </span>
      </div>
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.status !== 'archived') ||
      (statusFilter === 'archived' && user.status === 'archived');
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Loading screen matching App.jsx style
  if (loading) {
    return (
      <AdminSidebarNav>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100 select-none">
          <div className="text-center select-none">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4 select-none"></div>
            <p className="text-gray-600 font-medium select-none">Loading users...</p>
          </div>
        </div>
      </AdminSidebarNav>
    );
  }

  if (error) {
    return (
      <AdminSidebarNav>
        <div className="flex items-center justify-center min-h-screen select-none">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md select-none">
            <div className="flex items-center gap-3 mb-4 select-none">
              <AlertCircle className="w-6 h-6 text-red-600 select-none" />
              <h3 className="text-lg font-semibold text-red-800 select-none">Error Loading Users</h3>
            </div>
            <p className="text-red-700 mb-4 select-none">{error}</p>
            <button
              onClick={() => fetchUsers()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer select-none"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminSidebarNav>
    );
  }

  return (
    <AdminSidebarNav>
      <div className="min-h-screen space-y-6 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
          <div className="select-none">
            <h1 className="text-3xl font-bold text-gray-900 select-none">User Management</h1>
            <p className="text-gray-600 mt-1 select-none">Manage and monitor all platform users</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer select-none"
          >
            <Download className="w-4 h-4 select-none" />
            Export Data
          </motion.button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 select-none">
          {[
            { icon: Users, color: 'blue', label: 'Active Users', value: stats.total },
            { icon: User, color: 'blue', label: 'Clients', value: stats.clients },
            { icon: Crown, color: 'purple', label: 'Business Owners', value: stats.owners },
            { icon: Shield, color: 'red', label: 'Admins', value: stats.admins },
            { icon: Archive, color: 'gray', label: 'Archived', value: stats.archived }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-all cursor-default select-none"
            >
              <div className="flex items-center gap-3 select-none">
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center select-none`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600 select-none`} />
                </div>
                <div className="select-none">
                  <p className="text-2xl font-bold text-gray-900 select-none">{stat.value}</p>
                  <p className="text-sm text-gray-600 select-none">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search and Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-4 select-none"
        >
          <div className="flex flex-col md:flex-row gap-4 select-none">
            <div className="flex-1 relative select-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 select-none" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent select-none"
              />
              {searchTerm && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer select-none"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-4 h-4 select-none" />
                </button>
              )}
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer select-none"
            >
              <option value="all">All Roles</option>
              <option value="client">Clients</option>
              <option value="owner">Business Owners</option>
              <option value="admin">Admins</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer select-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </motion.div>

        {/* Results count */}
        <div className="text-sm text-gray-600 select-none">
          Showing {filteredUsers.length} of {users.length} users
        </div>

        {/* Users Table */}
        {filteredUsers.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden select-none"
          >
            <div className="overflow-x-auto custom-scrollbar select-none">
              <table className="w-full select-none">
                <thead className="bg-gray-50 border-b border-gray-200 select-none">
                  <tr className="select-none">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">Contact</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">Role</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">Joined</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 select-none">
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01, backgroundColor: '#f9fafb' }}
                      className="hover:bg-gray-50 transition-all cursor-pointer select-none"
                    >
                      <td className="px-6 py-4 select-none">
                        <div className="flex items-center gap-3 select-none">
                          <motion.div 
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold select-none"
                          >
                            {getInitials(user.first_name, user.last_name)}
                          </motion.div>
                          <div className="select-none">
                            <p className="font-medium text-gray-900 select-none">
                              {user.first_name || ''} {user.last_name || ''}
                            </p>
                            <p className="text-xs text-gray-500 select-none">ID: {user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 select-none">
                        <div className="space-y-1 select-none">
                          <div className="flex items-center gap-2 text-sm text-gray-600 select-none">
                            <Mail className="w-3 h-3 select-none" />
                            <span className="select-none">{user.email}</span>
                          </div>
                          {user.mobile && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 select-none">
                              <Phone className="w-3 h-3 select-none" />
                              <span className="select-none">{user.mobile}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center select-none">
                        {user.status === 'archived' ? (
                          <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-500 select-none">
                            {user.role}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:ring-2 focus:ring-blue-500 cursor-pointer select-none ${getRoleColor(user.role)}`}
                          >
                            <option value="client">Client</option>
                            <option value="owner">Business Owner</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 select-none">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 text-center select-none">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 select-none">
                          <Calendar className="w-3 h-3 select-none" />
                          <span className="select-none">{formatDate(user.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center select-none">
                        <div className="flex items-center justify-center gap-2 select-none">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleViewProfile(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer select-none"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4 select-none" />
                          </motion.button>
                          {user.status === 'archived' ? (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleUnarchiveUser(user.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer select-none"
                              title="Restore User"
                            >
                              <CheckCircle className="w-4 h-4 select-none" />
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleArchiveClick(user)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer select-none"
                              title="Archive User"
                            >
                              <Archive className="w-4 h-4 select-none" />
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteClick(user)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer select-none"
                            title="Delete User Permanently"
                          >
                            <Trash2 className="w-4 h-4 select-none" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 bg-white rounded-xl shadow-lg select-none"
          >
            <div className="text-6xl mb-4 select-none">👤</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 select-none">No Users Found</h3>
            <p className="text-gray-500 select-none">Try adjusting your search or filter to find what you're looking for.</p>
            {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer select-none"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear All Filters
              </motion.button>
            )}
          </motion.div>
        )}
      </div>

      {/* Profile View Modal */}
      <AnimatePresence>
        {showProfileModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 select-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative flex items-center gap-4 select-none">
                  <motion.div 
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm text-3xl font-bold text-white select-none"
                  >
                    {getInitials(selectedUser.first_name, selectedUser.last_name)}
                  </motion.div>
                  <div className="select-none">
                    <h3 className="text-2xl font-bold text-white select-none">{selectedUser.first_name} {selectedUser.last_name}</h3>
                    <p className="text-blue-100 text-sm select-none">{selectedUser.role?.toUpperCase()}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 select-none">
                <div className="grid grid-cols-2 gap-6 select-none">
                  <div className="select-none">
                    <h4 className="text-sm font-semibold text-gray-500 mb-3 select-none">Personal Information</h4>
                    <div className="space-y-3 select-none">
                      <div className="select-none">
                        <p className="text-xs text-gray-400 select-none">Email Address</p>
                        <p className="text-sm font-medium text-gray-800 flex items-center gap-2 select-none">
                          <Mail className="w-4 h-4 text-gray-400 select-none" />
                          {selectedUser.email}
                        </p>
                      </div>
                      {selectedUser.mobile && (
                        <div className="select-none">
                          <p className="text-xs text-gray-400 select-none">Mobile Number</p>
                          <p className="text-sm font-medium text-gray-800 flex items-center gap-2 select-none">
                            <Phone className="w-4 h-4 text-gray-400 select-none" />
                            {selectedUser.mobile}
                          </p>
                        </div>
                      )}
                      <div className="select-none">
                        <p className="text-xs text-gray-400 select-none">User ID</p>
                        <p className="text-sm font-medium text-gray-800 font-mono select-none">{selectedUser.id}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="select-none">
                    <h4 className="text-sm font-semibold text-gray-500 mb-3 select-none">Account Information</h4>
                    <div className="space-y-3 select-none">
                      <div className="select-none">
                        <p className="text-xs text-gray-400 select-none">Role</p>
                        <p className="text-sm font-medium text-gray-800 capitalize flex items-center gap-2 select-none">
                          {selectedUser.role === 'owner' && <Crown className="w-4 h-4 text-purple-500 select-none" />}
                          {selectedUser.role === 'admin' && <Shield className="w-4 h-4 text-red-500 select-none" />}
                          {selectedUser.role === 'client' && <User className="w-4 h-4 text-blue-500 select-none" />}
                          {selectedUser.role}
                        </p>
                      </div>
                      <div className="select-none">
                        <p className="text-xs text-gray-400 select-none">Status</p>
                        <div className="select-none">
                          {selectedUser.status === 'archived' ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1 w-fit select-none">
                              <Archive className="w-3 h-3 select-none" /> Archived
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600 flex items-center gap-1 w-fit select-none">
                              <CheckCircle className="w-3 h-3 select-none" /> Active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="select-none">
                        <p className="text-xs text-gray-400 select-none">Joined Date</p>
                        <p className="text-sm font-medium text-gray-800 flex items-center gap-2 select-none">
                          <Calendar className="w-4 h-4 text-gray-400 select-none" />
                          {formatDateTime(selectedUser.created_at)}
                        </p>
                      </div>
                      {selectedUser.archived_at && (
                        <div className="select-none">
                          <p className="text-xs text-gray-400 select-none">Archived Date</p>
                          <p className="text-sm font-medium text-gray-800 flex items-center gap-2 select-none">
                            <Archive className="w-4 h-4 text-gray-400 select-none" />
                            {formatDateTime(selectedUser.archived_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3 select-none">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer select-none"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive Confirmation Modal */}
      <AnimatePresence>
        {showArchiveModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none"
            onClick={() => setShowArchiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-gradient-to-r from-orange-500 to-red-500 p-6 select-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative flex items-center gap-4 select-none">
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm select-none"
                  >
                    <Archive className="w-8 h-8 text-white select-none" />
                  </motion.div>
                  <div className="select-none">
                    <h3 className="text-xl font-bold text-white select-none">Archive User</h3>
                    <p className="text-orange-100 text-sm select-none">This action can be undone</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 select-none">
                <p className="text-gray-700 mb-2 select-none">
                  Are you sure you want to archive <span className="font-semibold text-orange-600 select-none">{selectedUser.first_name} {selectedUser.last_name}</span>?
                </p>
                <p className="text-sm text-gray-500 mb-6 select-none">
                  Archiving this user will:
                </p>
                <ul className="text-sm text-gray-500 space-y-1 mb-6 ml-4 select-none">
                  <li className="flex items-center gap-2 select-none">• Hide them from active user lists</li>
                  <li className="flex items-center gap-2 select-none">• Prevent them from logging in</li>
                  <li className="flex items-center gap-2 select-none">• Their data will be preserved</li>
                  <li className="flex items-center gap-2 text-green-600 select-none">✓ You can unarchive them later</li>
                </ul>
                
                <div className="flex gap-3 select-none">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowArchiveModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer select-none"
                    disabled={actionLoading}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmArchive}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer select-none"
                  >
                    {actionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin select-none"></div>
                        Archiving...
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 select-none" />
                        Archive User
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-gradient-to-r from-red-500 to-red-600 p-6 select-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative flex items-center gap-4 select-none">
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm select-none"
                  >
                    <AlertTriangle className="w-8 h-8 text-white select-none" />
                  </motion.div>
                  <div className="select-none">
                    <h3 className="text-xl font-bold text-white select-none">Delete User Permanently</h3>
                    <p className="text-red-100 text-sm select-none">This action cannot be undone</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 select-none">
                <p className="text-gray-700 mb-2 select-none">
                  Are you sure you want to permanently delete <span className="font-semibold text-red-600 select-none">{selectedUser.first_name} {selectedUser.last_name}</span>?
                </p>
                <p className="text-sm text-gray-500 mb-4 select-none">
                  This will permanently remove:
                </p>
                <ul className="text-sm text-red-600 space-y-1 mb-6 ml-4 select-none">
                  <li className="flex items-center gap-2 select-none">• User profile</li>
                  <li className="flex items-center gap-2 select-none">• All memberships</li>
                  <li className="flex items-center gap-2 select-none">• Reviews and ratings</li>
                  <li className="flex items-center gap-2 select-none">• Notifications</li>
                  <li className="flex items-center gap-2 font-semibold select-none">⚠️ This action CANNOT be undone!</li>
                </ul>
                
                <div className="flex gap-3 select-none">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer select-none"
                    disabled={actionLoading}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmDelete}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer select-none"
                  >
                    {actionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin select-none"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 select-none" />
                        Delete Permanently
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blue Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
        }
      `}</style>
    </AdminSidebarNav>
  );
};

export default AdminUserManagement;