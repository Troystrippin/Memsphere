import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminSidebarNav from '../components/admin/AdminSidebarNav';
import '../styles/AdminUserManagement.css';

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          mobile,
          role,
          avatar_url,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process avatar URLs
      const processedData = await Promise.all((data || []).map(async (user) => {
        let avatarUrl = null;
        if (user.avatar_url) {
          avatarUrl = await getAvatarUrl(user.avatar_url, user.id);
        }
        return { ...user, avatarUrl };
      }));

      setUsers(processedData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = async (avatarPath, userId) => {
    if (!avatarPath) return null;

    try {
      const { data: publicUrlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(avatarPath);
      
      if (publicUrlData?.publicUrl) {
        try {
          const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            return publicUrlData.publicUrl;
          }
        } catch (e) {
          console.log('Public URL not accessible, trying download...');
        }
      }

      const { data, error } = await supabase.storage
        .from('avatars')
        .download(avatarPath);

      if (error) throw error;

      return URL.createObjectURL(data);
    } catch (error) {
      console.error('Error getting avatar URL:', error);
      return null;
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      alert(`User role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role. Please try again.');
    }
  };

  const handleSuspendUser = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'suspended' })
        .eq('id', userId);

      if (error) throw error;

      alert('User suspended successfully');
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user. Please try again.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      // Delete from profiles (cascade will handle auth.users if set up)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      alert('User deleted successfully');
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
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

  // Filter users based on search and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <AdminSidebarNav>
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </AdminSidebarNav>
    );
  }

  return (
    <AdminSidebarNav>
      <div className="user-management-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="page-title">User Management</h1>
          <button 
            className="btn-primary"
            onClick={() => navigate('/admin/users/invite')}
          >
            <span className="btn-icon">➕</span>
            Invite User
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="filters-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-group">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
              <option value="client">Client</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="user-cell">
                    <div className="user-avatar-small">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.first_name} />
                      ) : (
                        <div className="avatar-placeholder-small">
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="user-name">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="user-id">ID: {user.id.slice(0,8)}...</div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.mobile || '—'}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                      className={`role-select ${user.role}`}
                    >
                      <option value="client">Client</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleSuspendUser(user.id)}
                        className="action-btn suspend"
                        title="Suspend User"
                      >
                        ⚠️
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="action-btn delete"
                        title="Delete User"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <h3>No Users Found</h3>
              <p>Try adjusting your search or filter to find what you're looking for.</p>
            </div>
          )}
        </div>
      </div>
    </AdminSidebarNav>
  );
};

export default AdminUserManagement;