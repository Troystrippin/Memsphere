// src/hooks/useMembershipExpirationChecker.js
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';

export const useMembershipExpirationChecker = (user) => {
  const intervalRef = useRef(null);
  const isCheckingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasRunTodayRef = useRef(false);

  // Check if we've already run today
  const hasRunToday = () => {
    const today = new Date().toDateString();
    const lastRunKey = `expiry_checker_last_run_${user?.id}`;
    const lastRun = localStorage.getItem(lastRunKey);
    return lastRun === today;
  };

  // Mark that we've run today
  const markRunToday = () => {
    const today = new Date().toDateString();
    const lastRunKey = `expiry_checker_last_run_${user?.id}`;
    localStorage.setItem(lastRunKey, today);
  };

  // Check if notification was already sent today
  const wasNotificationSentToday = (membershipId, type, daysLeft = null) => {
    const today = new Date().toDateString();
    const key = `expiry_notification_${membershipId}_${type}${daysLeft ? `_${daysLeft}` : ''}`;
    const lastSent = localStorage.getItem(key);
    return lastSent === today;
  };

  // Mark notification as sent for today
  const markNotificationSent = (membershipId, type, daysLeft = null) => {
    const today = new Date().toDateString();
    const key = `expiry_notification_${membershipId}_${type}${daysLeft ? `_${daysLeft}` : ''}`;
    localStorage.setItem(key, today);
    console.log(`✅ Marked notification as sent: ${key}`);
  };

  const checkExpiringMemberships = async () => {
    // Prevent concurrent checks
    if (isCheckingRef.current) {
      console.log('⏭️ Already checking, skipping...');
      return;
    }

    if (!user?.id) {
      console.log('⏭️ No user ID, skipping check');
      return;
    }

    // Check if we've already run today
    if (hasRunToday()) {
      console.log('⏭️ Already checked today, skipping...');
      return;
    }

    try {
      isCheckingRef.current = true;
      console.log('🔍 Checking expiring memberships for user:', user.id);

      const { data: memberships, error } = await supabase
        .from('memberships')
        .select(`
          *,
          business:business_id (
            id,
            name
          ),
          plan:plan_id (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (error) throw error;

      if (!memberships || memberships.length === 0) {
        console.log('📭 No active memberships found');
        markRunToday();
        return;
      }

      const now = new Date();
      
      for (const membership of memberships) {
        const endDate = new Date(membership.end_date);
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        const membershipId = membership.id;
        const planName = membership.plan?.name || 'Membership';
        const businessName = membership.business?.name || 'the business';

        // Check for expired memberships (daysLeft < 0)
        if (daysLeft < 0) {
          const alreadySent = wasNotificationSentToday(membershipId, 'expired');
          if (!alreadySent) {
            console.log(`📧 Sending EXPIRED notification for ${businessName} - ${planName} plan`);
            await notificationService.sendMembershipExpired(
              user.id,
              membership.id,
              membership.business_id,
              businessName,
              planName,
              membership.end_date
            );
            markNotificationSent(membershipId, 'expired');
          } else {
            console.log(`⏭️ Skipping expired notification for ${businessName} (already sent today)`);
          }
        } 
        // Check for memberships expiring in 3, 2, or 1 day(s)
        else if (daysLeft === 3 || daysLeft === 2 || daysLeft === 1) {
          const alreadySent = wasNotificationSentToday(membershipId, 'expiring', daysLeft);
          if (!alreadySent) {
            console.log(`📧 Sending EXPIRING notification for ${businessName} - ${planName} plan (${daysLeft} days left)`);
            await notificationService.sendMembershipExpiring(
              user.id,
              membership.id,
              membership.business_id,
              businessName,
              planName,
              daysLeft,
              membership.end_date
            );
            markNotificationSent(membershipId, 'expiring', daysLeft);
          } else {
            console.log(`⏭️ Skipping expiring notification for ${businessName} (already sent for ${daysLeft} day warning)`);
          }
        }
      }

      // Mark that we've run today
      markRunToday();
      
    } catch (error) {
      console.error('Error checking expiring memberships:', error);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    // Prevent double initialization in Strict Mode
    if (hasInitializedRef.current) {
      console.log('⏭️ Already initialized, skipping...');
      return;
    }

    if (!user?.id) {
      console.log('⏭️ No user ID, skipping initialization');
      return;
    }

    console.log('🚀 Setting up membership expiration checker for user:', user.id);
    hasInitializedRef.current = true;

    // Run initial check after a delay (prevents race conditions)
    const initialTimeout = setTimeout(() => {
      checkExpiringMemberships();
    }, 3000);

    // Set up interval to check once per day at midnight
    const getTimeUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      return midnight - now;
    };

    // Schedule next check at midnight
    const scheduleMidnightCheck = () => {
      const timeUntilMidnight = getTimeUntilMidnight();
      console.log(`⏰ Next check scheduled in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);
      
      const timeoutId = setTimeout(() => {
        checkExpiringMemberships();
        // After checking, schedule the next midnight check
        scheduleMidnightCheck();
      }, timeUntilMidnight);
      
      intervalRef.current = timeoutId;
    };

    scheduleMidnightCheck();

    // Cleanup
    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      isCheckingRef.current = false;
      hasInitializedRef.current = false;
    };
  }, [user?.id]);
};