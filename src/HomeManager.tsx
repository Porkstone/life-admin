import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { UserSelector } from "./UserSelector";

interface HomeManagerProps {
  selectedUserId: Id<"users"> | null;
  onUserChange: (userId: Id<"users"> | null) => void;
}

export function HomeManager({ selectedUserId, onUserChange }: HomeManagerProps) {
  const homes = useQuery(api.homes.list, selectedUserId ? { ownerId: selectedUserId } : {}) || [];
  const createHome = useMutation(api.homes.create);
  const updateHome = useMutation(api.homes.update);
  const removeHome = useMutation(api.homes.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingHome, setEditingHome] = useState<Id<"homes"> | null>(null);

  const handleCreateHome = async (homeData: any) => {
    try {
      await createHome({ ...homeData, ownerId: selectedUserId });
      toast.success("Home added successfully");
      setShowForm(false);
    } catch (error) {
      toast.error("Failed to add home");
      console.error(error);
    }
  };

  const handleUpdateHome = async (homeData: any) => {
    if (!editingHome) return;
    
    try {
      await updateHome({ id: editingHome, ...homeData });
      toast.success("Home updated successfully");
      setEditingHome(null);
    } catch (error) {
      toast.error("Failed to update home");
      console.error(error);
    }
  };

  const handleDeleteHome = async (homeId: Id<"homes">) => {
    if (confirm("Are you sure you want to delete this home?")) {
      try {
        await removeHome({ id: homeId });
        toast.success("Home deleted successfully");
      } catch (error) {
        toast.error("Failed to delete home");
        console.error(error);
      }
    }
  };

  const editingHomeData = editingHome ? homes.find(h => h._id === editingHome) : null;

  return (
    <div className="space-y-6">
      <UserSelector selectedUserId={selectedUserId} onUserChange={onUserChange} />
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Homes & Properties</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add Home
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showForm || editingHome) && (
        <HomeForm
          home={editingHomeData}
          onSubmit={editingHome ? handleUpdateHome : handleCreateHome}
          onCancel={() => {
            setShowForm(false);
            setEditingHome(null);
          }}
        />
      )}

      {/* Homes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {homes.map((home) => (
          <HomeCard
            key={home._id}
            home={home}
            onEdit={() => setEditingHome(home._id)}
            onDelete={() => handleDeleteHome(home._id)}
          />
        ))}
      </div>

      {homes.length === 0 && !showForm && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No homes added yet</h3>
          <p className="text-gray-600 mb-4">Start by adding your first property</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Your First Home
          </button>
        </div>
      )}
    </div>
  );
}

interface HomeFormProps {
  home?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

function HomeForm({ home, onSubmit, onCancel }: HomeFormProps) {
  const [formData, setFormData] = useState({
    nickname: home?.nickname || "",
    address: home?.address || "",
    city: home?.city || "",
    state: home?.state || "",
    postalCode: home?.postalCode || "",
    country: home?.country || "United Kingdom",
    propertyType: home?.propertyType || "house",
    ownership: home?.ownership || "owned",
    purchaseDate: home?.purchaseDate || "",
    purchasePrice: home?.purchasePrice || "",
    mortgageProvider: home?.mortgageProvider || "",
    mortgageBalance: home?.mortgageBalance || "",
    insuranceProvider: home?.insuranceProvider || "",
    insuranceExpiry: home?.insuranceExpiry || "",
    councilTaxBand: home?.councilTaxBand || "",
    notes: home?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
      mortgageBalance: formData.mortgageBalance ? Number(formData.mortgageBalance) : undefined,
    };

    // Remove empty strings and convert to undefined
    Object.keys(submitData).forEach(key => {
      if (submitData[key as keyof typeof submitData] === "") {
        submitData[key as keyof typeof submitData] = undefined;
      }
    });

    onSubmit(submitData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white p-6 rounded-lg border shadow-xs">
      <h3 className="text-lg font-semibold mb-4">
        {home ? "Edit Home" : "Add New Home"}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nickname *
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => handleChange("nickname", e.target.value)}
              placeholder="e.g., Main Home, Holiday Home"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Type
            </label>
            <select
              value={formData.propertyType}
              onChange={(e) => handleChange("propertyType", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address *
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Street address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="City"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State/County
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => handleChange("state", e.target.value)}
              placeholder="State or County"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => handleChange("postalCode", e.target.value)}
              placeholder="Postal code"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country *
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => handleChange("country", e.target.value)}
              placeholder="Country"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ownership Status
            </label>
            <select
              value={formData.ownership}
              onChange={(e) => handleChange("ownership", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="owned">Owned</option>
              <option value="rented">Rented</option>
              <option value="family">Family Property</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => handleChange("purchaseDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price (£)
            </label>
            <input
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => handleChange("purchasePrice", e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mortgage Provider
            </label>
            <input
              type="text"
              value={formData.mortgageProvider}
              onChange={(e) => handleChange("mortgageProvider", e.target.value)}
              placeholder="Bank or lender"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mortgage Balance (£)
            </label>
            <input
              type="number"
              value={formData.mortgageBalance}
              onChange={(e) => handleChange("mortgageBalance", e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Provider
            </label>
            <input
              type="text"
              value={formData.insuranceProvider}
              onChange={(e) => handleChange("insuranceProvider", e.target.value)}
              placeholder="Insurance company"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Expiry
            </label>
            <input
              type="date"
              value={formData.insuranceExpiry}
              onChange={(e) => handleChange("insuranceExpiry", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Council Tax Band
          </label>
          <select
            value={formData.councilTaxBand}
            onChange={(e) => handleChange("councilTaxBand", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select band</option>
            <option value="A">Band A</option>
            <option value="B">Band B</option>
            <option value="C">Band C</option>
            <option value="D">Band D</option>
            <option value="E">Band E</option>
            <option value="F">Band F</option>
            <option value="G">Band G</option>
            <option value="H">Band H</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Additional notes about this property..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            {home ? "Update Home" : "Add Home"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

interface HomeCardProps {
  home: any;
  onEdit: () => void;
  onDelete: () => void;
}

function HomeCard({ home, onEdit, onDelete }: HomeCardProps) {
  const getPropertyIcon = (type: string) => {
    const icons: Record<string, string> = {
      house: "🏠",
      apartment: "🏢",
      condo: "🏘️",
      townhouse: "🏘️",
      other: "🏗️",
    };
    return icons[type] || icons.other;
  };

  const getOwnershipBadge = (ownership: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      owned: { text: "Owned", color: "bg-green-100 text-green-800" },
      rented: { text: "Rented", color: "bg-blue-100 text-blue-800" },
      family: { text: "Family", color: "bg-purple-100 text-purple-800" },
      other: { text: "Other", color: "bg-gray-100 text-gray-800" },
    };
    return badges[ownership] || badges.other;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const ownershipBadge = getOwnershipBadge(home.ownership);

  return (
    <div className="bg-white p-4 rounded-lg border shadow-xs hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getPropertyIcon(home.propertyType)}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{home.nickname}</h3>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${ownershipBadge.color}`}>
              {ownershipBadge.text}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600">📍 </span>
          <span className="text-gray-900">
            {home.address}, {home.city}
            {home.state && `, ${home.state}`}
            {home.postalCode && ` ${home.postalCode}`}
          </span>
        </div>

        {home.purchasePrice && (
          <div>
            <span className="text-gray-600">💰 </span>
            <span className="text-gray-900">
              Purchased for {formatCurrency(home.purchasePrice)}
              {home.purchaseDate && ` on ${new Date(home.purchaseDate).toLocaleDateString()}`}
            </span>
          </div>
        )}

        {home.mortgageBalance && (
          <div>
            <span className="text-gray-600">🏦 </span>
            <span className="text-gray-900">
              Mortgage: {formatCurrency(home.mortgageBalance)}
              {home.mortgageProvider && ` with ${home.mortgageProvider}`}
            </span>
          </div>
        )}

        {home.insuranceProvider && (
          <div>
            <span className="text-gray-600">🛡️ </span>
            <span className="text-gray-900">
              Insurance: {home.insuranceProvider}
              {home.insuranceExpiry && ` (expires ${new Date(home.insuranceExpiry).toLocaleDateString()})`}
            </span>
          </div>
        )}

        {home.councilTaxBand && (
          <div>
            <span className="text-gray-600">🏛️ </span>
            <span className="text-gray-900">Council Tax Band {home.councilTaxBand}</span>
          </div>
        )}

        {home.notes && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <span className="text-gray-600">📝 </span>
            <span className="text-gray-700">{home.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
