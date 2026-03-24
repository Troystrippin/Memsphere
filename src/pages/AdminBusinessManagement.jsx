import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AdminSidebarNav from "../components/admin/AdminSidebarNav";
import RejectionModal from "../components/admin/RejectionModal";
import PermitViewerModal from "../components/admin/PermitViewerModal";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  Archive,
  RefreshCw,
  Building,
  FileText,
  AlertTriangle,
  User,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Globe,
  Star,
  Users,
  Plus,
  X,
  ChevronRight,
  Clock,
  Search,
  Square,
  CheckSquare,
} from "lucide-react";

const AdminBusinessManagement = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmBusinessId, setConfirmBusinessId] = useState(null);
  const [confirmBusinessName, setConfirmBusinessName] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [selectedBusinesses, setSelectedBusinesses] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
    archived: 0,
    verified: 0,
    unverified: 0,
    permitPending: 0,
  });

  // Business types for filter and icons
  const businessTypes = [
    { id: "all", label: "All Types", icon: "🏢" },
    { id: "gym", label: "Gym", icon: "🏋️" },
    { id: "cafe", label: "Cafe", icon: "☕" },
    { id: "bookstore", label: "Bookstore", icon: "📚" },
  ];

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    filterBusinesses();
  }, [searchTerm, statusFilter, typeFilter, verificationFilter, businesses]);

  useEffect(() => {
    // Reset select all when filtered businesses change
    setSelectAll(false);
    setSelectedBusinesses(new Set());
  }, [filteredBusinesses]);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("businesses")
        .select(
          `
          *,
          owner:profiles!businesses_owner_id_fkey (
            id,
            email,
            first_name,
            last_name,
            role,
            verification_status
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBusinesses(data || []);
      setFilteredBusinesses(data || []);

      const stats = {
        total: data?.length || 0,
        active: data?.filter((b) => b.status === "active").length || 0,
        pending:
          data?.filter((b) => b.verification_status === "pending").length || 0,
        suspended: data?.filter((b) => b.status === "suspended").length || 0,
        archived: data?.filter((b) => b.status === "archived").length || 0,
        verified:
          data?.filter(
            (b) => b.verification_status === "approved" && b.permit_verified,
          ).length || 0,
        unverified:
          data?.filter(
            (b) =>
              b.verification_status === "pending" || !b.verification_status,
          ).length || 0,
        permitPending:
          data?.filter((b) => b.permit_document && !b.permit_verified).length ||
          0,
      };
      setStats(stats);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast.error("Failed to load businesses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filterBusinesses = () => {
    let filtered = [...businesses];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (business) =>
          business.name?.toLowerCase().includes(term) ||
          business.business_type?.toLowerCase().includes(term) ||
          business.owner?.email?.toLowerCase().includes(term) ||
          business.owner?.first_name?.toLowerCase().includes(term) ||
          business.owner?.last_name?.toLowerCase().includes(term) ||
          business.location?.toLowerCase().includes(term) ||
          business.permit_number?.toLowerCase().includes(term),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (business) => business.status === statusFilter,
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (business) => business.business_type === typeFilter,
      );
    }

    if (verificationFilter !== "all") {
      filtered = filtered.filter(
        (business) => business.verification_status === verificationFilter,
      );
    }

    setFilteredBusinesses(filtered);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedBusinesses(new Set());
    } else {
      const newSelected = new Set();
      filteredBusinesses.forEach((business) => newSelected.add(business.id));
      setSelectedBusinesses(newSelected);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectBusiness = (businessId) => {
    const newSelected = new Set(selectedBusinesses);
    if (newSelected.has(businessId)) {
      newSelected.delete(businessId);
    } else {
      newSelected.add(businessId);
    }
    setSelectedBusinesses(newSelected);
    setSelectAll(
      newSelected.size === filteredBusinesses.length &&
        filteredBusinesses.length > 0,
    );
  };

  const showConfirmDialog = (action, businessId, businessName) => {
    setConfirmAction(action);
    setConfirmBusinessId(businessId);
    setConfirmBusinessName(businessName);
    setShowConfirmModal(true);
  };

  const handleBulkAction = async (action) => {
    const businessIds = Array.from(selectedBusinesses);
    if (businessIds.length === 0) return;

    setShowConfirmModal(false);

    for (const businessId of businessIds) {
      setActionLoading((prev) => ({ ...prev, [businessId]: action }));
    }

    try {
      let updateData = {};
      let successMessage = "";

      switch (action) {
        case "archive":
          updateData = {
            status: "archived",
            updated_at: new Date().toISOString(),
          };
          successMessage = `${businessIds.length} business(es) archived successfully!`;
          break;
        case "suspend":
          updateData = {
            status: "suspended",
            updated_at: new Date().toISOString(),
          };
          successMessage = `${businessIds.length} business(es) suspended successfully!`;
          break;
        case "delete":
          // For delete, we need to delete each business individually
          let deleteCount = 0;
          for (const businessId of businessIds) {
            const { error } = await supabase
              .from("businesses")
              .delete()
              .eq("id", businessId);
            if (!error) deleteCount++;
          }
          await fetchBusinesses();
          setSelectedBusinesses(new Set());
          setSelectAll(false);
          toast.success(`${deleteCount} business(es) deleted successfully.`);
          setActionLoading({});
          return;
        default:
          return;
      }

      if (action !== "delete") {
        const { error } = await supabase
          .from("businesses")
          .update(updateData)
          .in("id", businessIds);

        if (error) throw error;

        await fetchBusinesses();
        toast.success(successMessage);
      }

      setSelectedBusinesses(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      toast.error(`Failed to ${action} businesses: ${error.message}`);
    } finally {
      setActionLoading({});
    }
  };

  const handleApproveBusiness = async (business) => {
    try {
      setActionLoading((prev) => ({ ...prev, [business.id]: "approve" }));

      if (!business.permit_document) {
        toast.error(
          "This business has not uploaded a business permit. Please ask them to upload a permit first.",
        );
        return;
      }

      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .maybeSingle();

      const { error: businessError } = await supabase
        .from("businesses")
        .update({
          verification_status: "approved",
          status: "active",
          permit_verified: true,
          permit_verified_at: new Date().toISOString(),
          permit_verified_by: adminProfile?.id || null,
          verified_at: new Date().toISOString(),
          verified_by: adminProfile?.id || null,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", business.id);

      if (businessError) throw businessError;

      if (business.owner_id) {
        const { data: ownerData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", business.owner_id)
          .maybeSingle();

        if (ownerData?.role === "pending_owner") {
          await supabase
            .from("profiles")
            .update({
              role: "owner",
              verification_status: "approved",
              approved_at: new Date().toISOString(),
              approved_by: adminProfile?.id || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", business.owner_id);
        }
      }

      try {
        await supabase.from("verification_logs").insert({
          business_id: business.id,
          owner_id: business.owner_id,
          action_by: adminProfile?.id || null,
          action_type: "approve",
          created_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.error("Log error (non-critical):", logError);
      }

      await fetchBusinesses();
      toast.success("Business approved successfully!");
    } catch (error) {
      console.error("Error approving business:", error);
      toast.error(`Failed to approve business: ${error.message || "Please try again."}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [business.id]: null }));
    }
  };

  const handleRejectBusiness = async (business, reason) => {
    try {
      setActionLoading((prev) => ({ ...prev, [business.id]: "reject" }));

      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .maybeSingle();

      const { error: businessError } = await supabase
        .from("businesses")
        .update({
          verification_status: "rejected",
          status: "inactive",
          rejection_reason: reason,
          permit_verified: false,
          verified_at: new Date().toISOString(),
          verified_by: adminProfile?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", business.id);

      if (businessError) {
        console.error("Business update error:", businessError);
        throw businessError;
      }

      try {
        await supabase.from("verification_logs").insert({
          business_id: business.id,
          owner_id: business.owner_id,
          action_by: adminProfile?.id || null,
          action_type: "reject",
          reason: reason,
          created_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.error("Log error (non-critical):", logError);
      }

      await fetchBusinesses();
      toast.success("Business rejected successfully.");
    } catch (error) {
      console.error("Error rejecting business:", error);
      toast.error(`Failed to reject business: ${error.message || "Please try again."}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [business.id]: null }));
      setShowRejectionModal(false);
      setSelectedBusiness(null);
    }
  };

  const handleRejectClick = (business) => {
    setSelectedBusiness(business);
    setShowRejectionModal(true);
  };

  const handleSuspendBusiness = async (businessId) => {
    setShowConfirmModal(false);
    try {
      setActionLoading((prev) => ({ ...prev, [businessId]: "suspend" }));

      const { error } = await supabase
        .from("businesses")
        .update({
          status: "suspended",
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);

      if (error) throw error;

      await fetchBusinesses();
      toast.success("Business suspended successfully!");
    } catch (error) {
      console.error("Error suspending business:", error);
      toast.error(`Failed to suspend business: ${error.message || "Please try again."}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [businessId]: null }));
    }
  };

  const handleArchiveBusiness = async (businessId) => {
    setShowConfirmModal(false);
    try {
      setActionLoading((prev) => ({ ...prev, [businessId]: "archive" }));

      const { error } = await supabase
        .from("businesses")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);

      if (error) throw error;

      await fetchBusinesses();
      toast.success("Business archived successfully!");
    } catch (error) {
      console.error("Error archiving business:", error);
      toast.error(`Failed to archive business: ${error.message || "Please try again."}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [businessId]: null }));
    }
  };

  const handleActivateBusiness = async (businessId) => {
    setShowConfirmModal(false);
    try {
      setActionLoading((prev) => ({ ...prev, [businessId]: "activate" }));

      const { error } = await supabase
        .from("businesses")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);

      if (error) throw error;

      await fetchBusinesses();
      toast.success("Business activated successfully!");
    } catch (error) {
      console.error("Error activating business:", error);
      toast.error(`Failed to activate business: ${error.message || "Please try again."}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [businessId]: null }));
    }
  };

  const handleDeleteBusiness = async (businessId) => {
    setShowConfirmModal(false);
    try {
      setActionLoading((prev) => ({ ...prev, [businessId]: "delete" }));

      const { error } = await supabase
        .from("businesses")
        .delete()
        .eq("id", businessId);

      if (error) throw error;

      await fetchBusinesses();
      toast.success("Business deleted successfully.");
    } catch (error) {
      console.error("Error deleting business:", error);
      toast.error(`Failed to delete business: ${error.message || "Please try again."}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [businessId]: null }));
    }
  };

  const handleViewPermit = (business) => {
    setSelectedBusiness(business);
    setShowPermitModal(true);
  };

  const handleViewDetails = (business) => {
    setSelectedBusiness(business);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  const getBusinessIcon = (business) => {
    switch (business.business_type) {
      case "gym":
        return "🏋️";
      case "cafe":
        return "☕";
      case "bookstore":
        return "📚";
      default:
        return "🏢";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Active
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            Pending
          </span>
        );
      case "suspended":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Suspended
          </span>
        );
      case "archived":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            Archived
          </span>
        );
      case "inactive":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            Inactive
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getPermitBadge = (business) => {
    if (!business.permit_document) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          📄 No Permit
        </span>
      );
    }
    if (business.permit_verified) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          ✅ Permit Verified
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        ⏳ Permit Pending
      </span>
    );
  };

  // Confirmation Modal Component
  const ConfirmActionModal = () => {
    const getConfirmMessage = () => {
      switch (confirmAction) {
        case "suspend":
          return `Are you sure you want to suspend "${confirmBusinessName}"? The business will not be visible to users.`;
        case "archive":
          return `Are you sure you want to archive "${confirmBusinessName}"? The business will be hidden but all data will be preserved.`;
        case "activate":
          return `Are you sure you want to activate "${confirmBusinessName}"? The business will become visible to users again.`;
        case "delete":
          return `⚠️ ARE YOU ABSOLUTELY SURE?\n\nDeleting "${confirmBusinessName}" will permanently remove all associated data including:\n• Business information\n• Membership plans\n• Member memberships\n• Applications\n• Payment records\n\nThis action CANNOT be undone!`;
        case "bulk_suspend":
          return `Are you sure you want to suspend ${selectedBusinesses.size} business(es)? They will not be visible to users.`;
        case "bulk_archive":
          return `Are you sure you want to archive ${selectedBusinesses.size} business(es)? They will be hidden but data will be preserved.`;
        case "bulk_delete":
          return `⚠️ ARE YOU ABSOLUTELY SURE?\n\nDeleting ${selectedBusinesses.size} business(es) will permanently remove all associated data. This action CANNOT be undone!`;
        default:
          return "Are you sure you want to perform this action?";
      }
    };

    const handleConfirm = () => {
      if (confirmAction === "suspend") {
        handleSuspendBusiness(confirmBusinessId);
      } else if (confirmAction === "archive") {
        handleArchiveBusiness(confirmBusinessId);
      } else if (confirmAction === "activate") {
        handleActivateBusiness(confirmBusinessId);
      } else if (confirmAction === "delete") {
        handleDeleteBusiness(confirmBusinessId);
      } else if (confirmAction === "bulk_suspend") {
        handleBulkAction("suspend");
      } else if (confirmAction === "bulk_archive") {
        handleBulkAction("archive");
      } else if (confirmAction === "bulk_delete") {
        handleBulkAction("delete");
      }
    };

    const isBulkAction = confirmAction?.startsWith("bulk_");
    const isDelete =
      confirmAction === "delete" || confirmAction === "bulk_delete";
    const isActivate = confirmAction === "activate";

    const getHeaderColor = () => {
      if (isDelete) return "bg-red-600";
      if (isActivate) return "bg-green-600";
      return "bg-orange-600";
    };

    const getButtonColor = () => {
      if (isDelete) return "bg-red-600 hover:bg-red-700";
      if (isActivate) return "bg-green-600 hover:bg-green-700";
      return "bg-orange-600 hover:bg-orange-700";
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          <div className={`px-6 py-4 ${getHeaderColor()}`}>
            <h3 className="text-lg font-semibold text-white">
              {isDelete
                ? "⚠️ Confirm Permanent Deletion"
                : isActivate
                  ? "Confirm Activation"
                  : "Confirm Action"}
            </h3>
          </div>
          <div className="p-6">
            <p className="text-gray-700 whitespace-pre-line">
              {getConfirmMessage()}
            </p>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg transition-colors text-white ${getButtonColor()}`}
            >
              Confirm
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminSidebarNav>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100 select-none">
          <div className="text-center select-none">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4 select-none"></div>
            <p className="text-gray-600 font-medium select-none">
              Loading businesses...
            </p>
          </div>
        </div>
      </AdminSidebarNav>
    );
  }

  return (
    <AdminSidebarNav>
      <div className="space-y-6 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Business Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage and verify business accounts
            </p>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            onClick={() => navigate("/admin/businesses/add")}
          >
            <Plus className="w-4 h-4" />
            Add Business
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
                <p className="text-sm text-gray-600">Total Businesses</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.verified}
                </p>
                <p className="text-sm text-gray-600">Fully Verified</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.permitPending}
                </p>
                <p className="text-sm text-gray-600">Permit Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.suspended}
                </p>
                <p className="text-sm text-gray-600">Suspended</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search businesses by name, type, permit #, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Verification</option>
                <option value="approved">Fully Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {businessTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedBusinesses.size > 0 && (
          <div className="bg-blue-50 rounded-xl shadow-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {selectedBusinesses.size} business(es) selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction("bulk_archive")}
                className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-xs font-medium flex items-center gap-1"
              >
                <Archive className="w-3 h-3" />
                Archive Selected
              </button>
              <button
                onClick={() => setConfirmAction("bulk_suspend")}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                Suspend Selected
              </button>
              <button
                onClick={() => setConfirmAction("bulk_delete")}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="text-sm text-gray-600 flex items-center justify-between">
          <span>
            Showing {filteredBusinesses.length} of {businesses.length}{" "}
            businesses
          </span>
          {filteredBusinesses.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              {selectAll ? (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  Select All
                </>
              )}
            </button>
          )}
        </div>

        {/* Businesses Grid */}
        {filteredBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBusinesses.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${
                  selectedBusinesses.has(business.id)
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSelectBusiness(business.id)}
                        className="mt-1"
                      >
                        {selectedBusinesses.has(business.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-3xl">
                        {getBusinessIcon(business)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {business.name}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {business.business_type}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(business.status)}
                      {getPermitBadge(business)}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 w-20">Owner:</span>
                      <span className="text-gray-700">
                        {business.owner
                          ? `${business.owner.first_name || ""} ${business.owner.last_name || ""}`.trim() ||
                            business.owner.email
                          : "No owner"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 w-20">Location:</span>
                      <span className="text-gray-700">
                        {business.location || "Not specified"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 w-20">Permit #:</span>
                      <span className="text-gray-700">
                        {business.permit_number || "Not submitted"}
                      </span>
                      {business.permit_document && (
                        <button
                          onClick={() => handleViewPermit(business)}
                          className="text-blue-600 hover:text-blue-700 text-sm underline ml-2"
                        >
                          View Document
                        </button>
                      )}
                    </div>
                    {business.permit_expiry && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500 w-20">Expiry:</span>
                        <span className="text-gray-700">
                          {formatDate(business.permit_expiry)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 w-20">Created:</span>
                      <span className="text-gray-700">
                        {formatDate(business.created_at)}
                      </span>
                    </div>
                    {business.description && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {business.description.length > 100
                            ? `${business.description.substring(0, 100)}...`
                            : business.description}
                        </p>
                      </div>
                    )}
                    {business.verification_status === "rejected" &&
                      business.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg">
                          <p className="text-xs text-red-600 font-medium">
                            Rejection reason:
                          </p>
                          <p className="text-sm text-red-700">
                            {business.rejection_reason}
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                    {/* Approve Button */}
                    {business.verification_status === "pending" &&
                      business.permit_document && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApproveBusiness(business)}
                          disabled={actionLoading[business.id]}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                          title="Approve Business"
                        >
                          {actionLoading[business.id] === "approve" ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          <span>Approve</span>
                        </motion.button>
                      )}

                    {/* Reject Button */}
                    {business.verification_status === "pending" &&
                      business.permit_document && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRejectClick(business)}
                          disabled={actionLoading[business.id]}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                          title="Reject Business"
                        >
                          {actionLoading[business.id] === "reject" ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>Reject</span>
                        </motion.button>
                      )}

                    {/* Archive Button (for active businesses) */}
                    {business.status === "active" && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          showConfirmDialog(
                            "archive",
                            business.id,
                            business.name,
                          )
                        }
                        disabled={actionLoading[business.id]}
                        className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                        title="Archive Business"
                      >
                        {actionLoading[business.id] === "archive" ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Archive className="w-3 h-3" />
                        )}
                        <span>Archive</span>
                      </motion.button>
                    )}

                    {/* Suspend Button (for active businesses) */}
                    {business.status === "active" && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          showConfirmDialog(
                            "suspend",
                            business.id,
                            business.name,
                          )
                        }
                        disabled={actionLoading[business.id]}
                        className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                        title="Suspend Business"
                      >
                        {actionLoading[business.id] === "suspend" ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span>Suspend</span>
                      </motion.button>
                    )}

                    {/* Activate Button (for suspended/archived businesses) */}
                    {(business.status === "suspended" ||
                      business.status === "archived") && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          showConfirmDialog(
                            "activate",
                            business.id,
                            business.name,
                          )
                        }
                        disabled={actionLoading[business.id]}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                        title="Activate Business"
                      >
                        {actionLoading[business.id] === "activate" ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        <span>Activate</span>
                      </motion.button>
                    )}

                    {/* Reactivate Button (for inactive/rejected businesses with permit) */}
                    {business.status === "inactive" &&
                      business.permit_document && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApproveBusiness(business)}
                          disabled={actionLoading[business.id]}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                          title="Reactivate Business"
                        >
                          {actionLoading[business.id] === "approve" ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          <span>Reactivate</span>
                        </motion.button>
                      )}

                    {/* View Details Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleViewDetails(business)}
                      className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium flex items-center gap-1"
                      title="View Details"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Details</span>
                    </motion.button>

                    {/* Delete Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        showConfirmDialog("delete", business.id, business.name)
                      }
                      disabled={actionLoading[business.id]}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                      title="Delete Business Permanently"
                    >
                      {actionLoading[business.id] === "delete" ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      <span>Delete</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No Businesses Found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search or filter to find what you're looking
              for.
            </p>
            {(searchTerm ||
              statusFilter !== "all" ||
              typeFilter !== "all" ||
              verificationFilter !== "all") && (
              <button
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setVerificationFilter("all");
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Business Details Modal - No Footer */}
        <AnimatePresence>
          {showDetailsModal && selectedBusiness && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowDetailsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {getBusinessIcon(selectedBusiness)}
                    </span>
                    <h2 className="text-xl font-bold text-white">
                      {selectedBusiness.name}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Blue scrollbar styling */}
                <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200 hover:scrollbar-thumb-blue-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">
                        Business Information
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-500">Type:</span>{" "}
                          {selectedBusiness.business_type}
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>{" "}
                          {getStatusBadge(selectedBusiness.status)}
                        </div>
                        <div>
                          <span className="text-gray-500">Verification:</span>{" "}
                          {getPermitBadge(selectedBusiness)}
                        </div>
                        <div>
                          <span className="text-gray-500">Location:</span>{" "}
                          {selectedBusiness.location || "Not specified"}
                        </div>
                        <div>
                          <span className="text-gray-500">Address:</span>{" "}
                          {selectedBusiness.address || "Not specified"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">
                        Owner Information
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-500">Name:</span>{" "}
                          {selectedBusiness.owner
                            ? `${selectedBusiness.owner.first_name || ""} ${selectedBusiness.owner.last_name || ""}`.trim() ||
                              "N/A"
                            : "No owner"}
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>{" "}
                          {selectedBusiness.owner?.email || "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">
                        Permit Information
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-500">Permit Number:</span>{" "}
                          {selectedBusiness.permit_number || "Not provided"}
                        </div>
                        <div>
                          <span className="text-gray-500">Expiry Date:</span>{" "}
                          {selectedBusiness.permit_expiry
                            ? new Date(
                                selectedBusiness.permit_expiry,
                              ).toLocaleDateString()
                            : "Not provided"}
                        </div>
                        {selectedBusiness.permit_document && (
                          <div>
                            <button
                              onClick={() => {
                                setShowDetailsModal(false);
                                handleViewPermit(selectedBusiness);
                              }}
                              className="text-blue-600 hover:underline"
                            >
                              📄 View Permit Document
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">
                        Business Metrics
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-500">Members:</span>{" "}
                          {selectedBusiness.members_count || 0}
                        </div>
                        <div>
                          <span className="text-gray-500">Rating:</span>{" "}
                          {selectedBusiness.rating || "0.0"} ⭐
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>{" "}
                          {formatDate(selectedBusiness.created_at)}
                        </div>
                        <div>
                          <span className="text-gray-500">Last Updated:</span>{" "}
                          {formatDate(selectedBusiness.updated_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedBusiness.description && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">
                        Description
                      </h3>
                      <p className="mt-2 text-gray-700">
                        {selectedBusiness.description}
                      </p>
                    </div>
                  )}

                  {selectedBusiness.verification_status === "rejected" &&
                    selectedBusiness.rejection_reason && (
                      <div className="mt-4 p-4 bg-red-50 rounded-lg">
                        <h3 className="font-semibold text-red-800">
                          Rejection Reason
                        </h3>
                        <p className="text-red-700">
                          {selectedBusiness.rejection_reason}
                        </p>
                      </div>
                    )}
                </div>

                {/* No Footer - No buttons */}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Permit Viewer Modal */}
        <PermitViewerModal
          isOpen={showPermitModal}
          onClose={() => {
            setShowPermitModal(false);
            setSelectedBusiness(null);
          }}
          business={selectedBusiness}
        />

        {/* Rejection Modal */}
        <RejectionModal
          isOpen={showRejectionModal}
          onClose={() => {
            setShowRejectionModal(false);
            setSelectedBusiness(null);
          }}
          onConfirm={(reason) => handleRejectBusiness(selectedBusiness, reason)}
          ownerName={
            selectedBusiness
              ? `${selectedBusiness.owner?.first_name || ""} ${selectedBusiness.owner?.last_name || ""}`.trim()
              : ""
          }
          businessName={selectedBusiness?.name || ""}
        />

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirmModal && <ConfirmActionModal />}
        </AnimatePresence>
      </div>
    </AdminSidebarNav>
  );
};

export default AdminBusinessManagement;