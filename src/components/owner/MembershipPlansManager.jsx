import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../contexts/ThemeContext";

const MembershipPlansManager = ({ businessId }) => {
  const { isDarkMode } = useTheme();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    duration: "month",
    features: [""],
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (businessId) {
      fetchPlans();
    }
  }, [businessId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("business_id", businessId)
        .order("price", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load membership plans");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (index, value) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures[index] = value;
    setFormData((prev) => ({ ...prev, features: updatedFeatures }));
  };

  const addFeature = () => {
    setFormData((prev) => ({ ...prev, features: [...prev.features, ""] }));
  };

  const removeFeature = (index) => {
    const updatedFeatures = formData.features.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, features: updatedFeatures }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: 0,
      duration: "month",
      features: [""],
      is_active: true,
    });
    setEditingPlan(null);
    setShowForm(false);
  };

  const savePlan = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a plan name");
      return;
    }

    if (formData.price < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    try {
      setSaving(true);
      const filteredFeatures = formData.features.filter((f) => f.trim() !== "");

      const planData = {
        business_id: businessId,
        name: formData.name,
        price: formData.price,
        duration: formData.duration,
        features: filteredFeatures,
        is_active: formData.is_active,
      };

      let result;
      if (editingPlan) {
        result = await supabase
          .from("membership_plans")
          .update(planData)
          .eq("id", editingPlan.id)
          .select();
        toast.success("Plan updated successfully!");
      } else {
        result = await supabase
          .from("membership_plans")
          .insert([planData])
          .select();
        toast.success("Plan created successfully!");
      }

      const { error } = result;
      if (error) throw error;

      await fetchPlans();
      resetForm();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const editPlan = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      features: plan.features.length > 0 ? plan.features : [""],
      is_active: plan.is_active,
    });
    setShowForm(true);
  };

  const deletePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;

    try {
      const { error } = await supabase
        .from("membership_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      toast.success("Plan deleted successfully!");
      await fetchPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Failed to delete plan");
    }
  };

  const togglePlanStatus = async (plan) => {
    try {
      const { error } = await supabase
        .from("membership_plans")
        .update({ is_active: !plan.is_active })
        .eq("id", plan.id);

      if (error) throw error;

      toast.success(`Plan ${!plan.is_active ? "activated" : "deactivated"}`);
      await fetchPlans();
    } catch (error) {
      console.error("Error toggling plan status:", error);
      toast.error("Failed to update plan status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className={`w-8 h-8 border-2 rounded-full animate-spin ${
            isDarkMode
              ? "border-gray-600 border-t-blue-400"
              : "border-blue-200 border-t-blue-600"
          }`}
        ></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3
          className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
        >
          Membership Plans
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Plan
          </button>
        )}
      </div>

      {showForm && (
        <div
          className={`rounded-xl p-6 border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h4
              className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
            >
              {editingPlan ? "Edit Plan" : "Create New Plan"}
            </h4>
            <button
              onClick={resetForm}
              className={
                isDarkMode
                  ? "text-gray-400 hover:text-gray-300"
                  : "text-gray-400 hover:text-gray-600"
              }
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                Plan Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder="e.g., Basic Plan, Premium Plan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  Price *
                </label>
                <div className="relative">
                  <span
                    className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    ₱
                  </span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  Duration
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="month">per month</option>
                  <option value="year">per year</option>
                  <option value="week">per week</option>
                  <option value="day">per day</option>
                  <option value="session">per session</option>
                </select>
              </div>
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                Features
              </label>
              {formData.features.map((feature, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => handleFeatureChange(idx, e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    placeholder={`Feature ${idx + 1}`}
                  />
                  {formData.features.length > 1 && (
                    <button
                      onClick={() => removeFeature(idx)}
                      className="px-3 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addFeature}
                className={`text-sm flex items-center gap-1 mt-2 ${isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
              >
                <Plus className="w-4 h-4" />
                Add Feature
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  Active (visible to customers)
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={savePlan}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingPlan
                    ? "Update Plan"
                    : "Create Plan"}
              </button>
              <button
                onClick={resetForm}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  isDarkMode
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-5 transition-all hover:shadow-md ${
                isDarkMode
                  ? `bg-gray-800 border-gray-700 ${!plan.is_active ? "opacity-75" : ""}`
                  : `bg-white border-gray-200 ${!plan.is_active ? "opacity-75 bg-gray-50" : ""}`
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h4
                  className={`font-semibold text-lg ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
                  {plan.name}
                </h4>
                <button
                  onClick={() => togglePlanStatus(plan)}
                  className={
                    isDarkMode
                      ? "text-gray-400 hover:text-gray-300"
                      : "text-gray-400 hover:text-gray-600"
                  }
                >
                  {plan.is_active ? (
                    <ToggleRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="mb-3">
                <span
                  className={`text-2xl font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                >
                  ₱{plan.price.toLocaleString()}
                </span>
                <span
                  className={
                    isDarkMode
                      ? "text-gray-400 text-sm"
                      : "text-gray-500 text-sm"
                  }
                >
                  /{plan.duration}
                </span>
              </div>
              <ul className="space-y-2 mb-4">
                {plan.features.slice(0, 3).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDarkMode ? "text-green-400" : "text-green-500"}`}
                    />
                    <span
                      className={isDarkMode ? "text-gray-300" : "text-gray-600"}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li
                    className={`text-sm pl-6 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                  >
                    +{plan.features.length - 3} more
                  </li>
                )}
              </ul>
              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => editPlan(plan)}
                  className={`flex-1 px-3 py-1.5 text-sm border rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    isDarkMode
                      ? "border-blue-500 text-blue-400 hover:bg-blue-900/30"
                      : "border-blue-600 text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className={`flex-1 px-3 py-1.5 text-sm border rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    isDarkMode
                      ? "border-red-500 text-red-400 hover:bg-red-900/30"
                      : "border-red-600 text-red-600 hover:bg-red-50"
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`text-center py-12 rounded-xl border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
        >
          <div className="text-5xl mb-3">⭐</div>
          <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
            No membership plans yet
          </p>
          <p
            className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
          >
            Create your first plan to start offering memberships
          </p>
        </div>
      )}
    </div>
  );
};

export default MembershipPlansManager;
