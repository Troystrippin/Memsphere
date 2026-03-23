// src/hooks/useMembershipExpirationChecker.js
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';

export const useMembershipExpirationChecker = (user) => {
  const checkedRef = useRef(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const checkExpiringMemberships = async () => {
      try {
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

        const now = new Date();

        for (const membership of memberships || []) {
          const endDate = new Date(membership.end_date);
          const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
          const membershipKey = membership.id;
          const planName = membership.plan?.name || 'Membership';

          // Check for expired memberships
          if (daysLeft < 0) {
            const { data: expiredNotif } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('type', 'membership_expired')
              .eq('data->>membershipId', membership.id)
              .maybeSingle();

            if (!expiredNotif && !checkedRef.current.has(`${membershipKey}_expired`)) {
              checkedRef.current.add(`${membershipKey}_expired`);
              await notificationService.sendMembershipExpired(
                user.id,
                membership.id,
                membership.business_id,
                membership.business?.name || 'the business',
                planName,
                membership.end_date
              );
              console.log(`📧 Sent EXPIRED notification for ${membership.business?.name} - ${planName} plan`);
            }
          } 
          // Check for memberships expiring in 3 days or less
          else if (daysLeft <= 3 && daysLeft > 0) {
            const { data: existingNotif } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('type', 'membership_expiring')
              .eq('data->>membershipId', membership.id)
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .maybeSingle();

            if (!existingNotif && !checkedRef.current.has(membershipKey)) {
              checkedRef.current.add(membershipKey);
              await notificationService.sendMembershipExpiring(
                user.id,
                membership.id,
                membership.business_id,
                membership.business?.name || 'the business',
                planName,
                daysLeft,
                membership.end_date
              );
              console.log(`📧 Sent EXPIRING notification for ${membership.business?.name} - ${planName} plan (${daysLeft} days left)`);
            }
          }
        }
      } catch (error) {
        console.error('Error checking expiring memberships:', error);
      }
    };

    checkExpiringMemberships();
    const interval = setInterval(checkExpiringMemberships, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id]);
};