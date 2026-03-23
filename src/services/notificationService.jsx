// src/services/notificationService.js
import { supabase } from "../lib/supabase";

export const notificationService = {
  /**
   * Send notification to a user
   */
  async sendNotification(userId, type, title, message, data = {}) {
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: userId,
        type: type,
        title: title,
        message: message,
        data: data,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      console.log(`✅ Notification sent to ${userId}: ${title}`);
      return true;
    } catch (error) {
      console.error("Error sending notification:", error);
      return false;
    }
  },

  /**
   * Send payment confirmation notification to client
   */
  async sendPaymentConfirmation(userId, membershipId, businessName, amount) {
    return this.sendNotification(
      userId,
      "application_submitted",
      "📋 Application Submitted!",
      `Your membership application for ${businessName} has been submitted and is pending approval.`,
      {
        membershipId: membershipId,
        businessName: businessName,
        amount: amount,
        status: "pending",
      },
    );
  },

  /**
   * Send application received notification to owner
   */
  async sendApplicationReceivedToOwner(
    ownerId,
    businessId,
    businessName,
    applicantName,
    planName,
    amount,
  ) {
    return this.sendNotification(
      ownerId,
      "application_received",
      "📋 New Membership Application",
      `${applicantName} has applied for ${planName} at ${businessName}. Amount: ₱${amount.toLocaleString()}`,
      {
        businessId: businessId,
        businessName: businessName,
        applicantName: applicantName,
        planName: planName,
        amount: amount,
        action: "review",
      },
    );
  },

  /**
   * Send membership approval notification to client
   */
  async sendMembershipApproval(userId, membershipId, businessName, planName) {
    return this.sendNotification(
      userId,
      "membership_approved",
      "✅ Membership Approved!",
      `Your membership for ${businessName} (${planName}) has been approved! You can now enjoy the benefits.`,
      {
        membershipId: membershipId,
        businessName: businessName,
        planName: planName,
        status: "approved",
      },
    );
  },

  /**
   * Send membership rejection notification to client
   */
  async sendMembershipRejection(userId, membershipId, businessName, reason) {
    return this.sendNotification(
      userId,
      "membership_rejected",
      "❌ Membership Application Update",
      `Your membership application for ${businessName} was not approved. ${reason || "Please contact the business for more information."}`,
      {
        membershipId: membershipId,
        businessName: businessName,
        reason: reason,
        status: "rejected",
      },
    );
  },

  /**
   * Send membership removal notification to client
   */
  async sendMembershipRemoval(userId, membershipId, businessName, reason) {
    return this.sendNotification(
      userId,
      "membership_cancelled",
      "⚠️ Membership Cancelled",
      `Your membership with ${businessName} has been ${reason === "expired" ? "expired" : "cancelled"}. ${reason === "removed" ? "The owner has removed your membership." : "Please renew to continue enjoying benefits."}`,
      {
        membershipId: membershipId,
        businessName: businessName,
        reason: reason,
        status: "cancelled",
      },
    );
  },

  /**
   * Send message from owner to members
   */
  async sendOwnerMessage(
    userId,
    businessId,
    businessName,
    subject,
    message,
    type = "announcement",
  ) {
    return this.sendNotification(userId, type, subject, message, {
      businessId: businessId,
      businessName: businessName,
      sender: "owner",
    });
  },

  /**
   * Send membership expiring soon notification with plan name
   */
  async sendMembershipExpiring(userId, membershipId, businessId, businessName, planName, daysLeft, endDate) {
    return this.sendNotification(
      userId,
      'membership_expiring',
      `⚠️ ${planName} Membership Expiring Soon!`,
      `Your ${planName} membership at ${businessName} will expire in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Renew now to continue enjoying benefits!`,
      {
        membershipId: membershipId,
        businessId: businessId,
        businessName: businessName,
        planName: planName,
        daysLeft: daysLeft,
        endDate: endDate,
        action: 'renew'
      }
    );
  },

  /**
   * Send membership expired notification with plan name
   */
  async sendMembershipExpired(userId, membershipId, businessId, businessName, planName, endDate) {
    return this.sendNotification(
      userId,
      'membership_expired',
      `⏰ ${planName} Membership Expired`,
      `Your ${planName} membership at ${businessName} has expired. Click here to renew and continue enjoying benefits!`,
      {
        membershipId: membershipId,
        businessId: businessId,
        businessName: businessName,
        planName: planName,
        endDate: endDate,
        action: 'renew'
      }
    );
  },
};