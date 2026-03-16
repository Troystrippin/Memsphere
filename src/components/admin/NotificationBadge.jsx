import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import './NotificationBadge.css';

const NotificationBadge = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingCount();
    
    // Subscribe to real-time changes for pending applications
    const subscription = supabase
      .channel('pending-applications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'profiles',
          filter: 'role=eq.pending_owner'
        }, 
        (payload) => {
          console.log('New pending application:', payload);
          fetchPendingCount();
        }
      )
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: 'role=eq.pending_owner'
        },
        (payload) => {
          console.log('Pending application updated:', payload);
          fetchPendingCount();
        }
      )
      .on('postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'profiles',
          filter: 'role=eq.pending_owner'
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPendingCount = async () => {
    try {
      setLoading(true);
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'pending_owner');
      
      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending applications count:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show if no pending applications
  if (pendingCount === 0) return null;

  // Show loading state or count
  return (
    <span className="notification-badge" title={`${pendingCount} pending application${pendingCount > 1 ? 's' : ''}`}>
      {loading ? '...' : (pendingCount > 9 ? '9+' : pendingCount)}
    </span>
  );
};

export default NotificationBadge;