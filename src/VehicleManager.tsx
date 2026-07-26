import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { UserSelector } from "./UserSelector";

// Utility functions for date format conversion
const formatDateForDisplay = (isoDate: string): string => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateForInput = (isoDate: string): string => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatInputForStorage = (ddmmyyyy: string): string => {
  if (!ddmmyyyy) return "";
  const [day, month, year] = ddmmyyyy.split('-');
  if (!day || !month || !year) return "";
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const validateDateFormat = (dateString: string): boolean => {
  if (!dateString) return true; // Empty is valid
  const regex = /^\d{2}-\d{2}-\d{4}$/;
  if (!regex.test(dateString)) return false;
  
  const [day, month, year] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
};

interface Vehicle {
  _id: Id<"vehicles">;
  make: string;
  model: string;
  year: number;
  color?: string;
  licensePlate?: string;
  vin?: string;
  registrationExpiry?: string;
  insuranceProvider?: string;
  insuranceExpiry?: string;
  motExpiry?: string;
  serviceInterval?: string;
  nextServiceDueDate?: string;
  insuredAt?: Id<"homes">;
  addedToDart?: boolean;
  notes?: string;
}

interface VehicleManagerProps {
  selectedUserId: Id<"users"> | null;
  onUserChange: (userId: Id<"users"> | null) => void;
}

export function VehicleManager({ selectedUserId, onUserChange }: VehicleManagerProps) {
  const vehicles = useQuery(api.vehicles.list, selectedUserId ? { ownerId: selectedUserId } : {}) || [];
  const homes = useQuery(api.homes.list, selectedUserId ? { ownerId: selectedUserId } : {}) || [];
  const createVehicle = useMutation(api.vehicles.create);
  const updateVehicle = useMutation(api.vehicles.update);
  const removeVehicle = useMutation(api.vehicles.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    licensePlate: "",
    vin: "",
    registrationExpiry: "",
    insuranceProvider: "",
    insuranceExpiry: "",
    motExpiry: "",
    serviceInterval: "",
    nextServiceDueDate: "",
    insuredAt: "",
    addedToDart: false,
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      licensePlate: "",
      vin: "",
      registrationExpiry: "",
      insuranceProvider: "",
      insuranceExpiry: "",
      motExpiry: "",
      serviceInterval: "",
      nextServiceDueDate: "",
      insuredAt: "",
      addedToDart: false,
      notes: "",
    });
    setEditingVehicle(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.make.trim() || !formData.model.trim()) {
      toast.error("Make and model are required");
      return;
    }

    // Validate date formats
    if (!validateDateFormat(formData.registrationExpiry)) {
      toast.error("Road tax expiry must be in DD-MM-YYYY format");
      return;
    }
    if (!validateDateFormat(formData.insuranceExpiry)) {
      toast.error("Insurance expiry must be in DD-MM-YYYY format");
      return;
    }
    if (!validateDateFormat(formData.motExpiry)) {
      toast.error("MOT expiry must be in DD-MM-YYYY format");
      return;
    }
    if (!validateDateFormat(formData.nextServiceDueDate)) {
      toast.error("Next service due date must be in DD-MM-YYYY format");
      return;
    }

    try {
      const vehicleData = {
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: formData.year,
        color: formData.color.trim() || undefined,
        licensePlate: formData.licensePlate.trim() || undefined,
        vin: formData.vin.trim() || undefined,
        registrationExpiry: formatInputForStorage(formData.registrationExpiry) || undefined,
        insuranceProvider: formData.insuranceProvider.trim() || undefined,
        insuranceExpiry: formatInputForStorage(formData.insuranceExpiry) || undefined,
        motExpiry: formatInputForStorage(formData.motExpiry) || undefined,
        serviceInterval: formData.serviceInterval.trim() || undefined,
        nextServiceDueDate: formatInputForStorage(formData.nextServiceDueDate) || undefined,
        insuredAt: formData.insuredAt ? (formData.insuredAt as Id<"homes">) : undefined,
        addedToDart: formData.addedToDart,
        notes: formData.notes.trim() || undefined,
      };

      if (editingVehicle) {
        await updateVehicle({
          id: editingVehicle._id,
          ...vehicleData,
        });
        toast.success("Vehicle updated successfully");
      } else {
        await createVehicle({ ...vehicleData, ownerId: selectedUserId || undefined });
        toast.success("Vehicle added successfully");
      }
      
      resetForm();
    } catch (error) {
      toast.error("Failed to save vehicle");
      console.error(error);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color || "",
      licensePlate: vehicle.licensePlate || "",
      vin: vehicle.vin || "",
      registrationExpiry: formatDateForInput(vehicle.registrationExpiry || ""),
      insuranceProvider: vehicle.insuranceProvider || "",
      insuranceExpiry: formatDateForInput(vehicle.insuranceExpiry || ""),
      motExpiry: formatDateForInput(vehicle.motExpiry || ""),
      serviceInterval: vehicle.serviceInterval || "",
      nextServiceDueDate: formatDateForInput(vehicle.nextServiceDueDate || ""),
      insuredAt: vehicle.insuredAt || "",
      addedToDart: vehicle.addedToDart || false,
      notes: vehicle.notes || "",
    });
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  const handleDelete = async (vehicleId: Id<"vehicles">) => {
    if (confirm("Are you sure you want to delete this vehicle?")) {
      try {
        await removeVehicle({ id: vehicleId });
        toast.success("Vehicle deleted successfully");
      } catch (error) {
        toast.error("Failed to delete vehicle");
        console.error(error);
      }
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: "expired", text: "Expired", color: "text-red-600" };
    if (diffDays <= 30) return { status: "expiring", text: `${diffDays} days`, color: "text-orange-600" };
    return { status: "valid", text: `${diffDays} days`, color: "text-green-600" };
  };

  const getHomeName = (homeId?: Id<"homes">) => {
    if (!homeId) return null;
    const home = homes.find(h => h._id === homeId);
    return home?.nickname;
  };

  return (
    <div className="space-y-6">
      <UserSelector selectedUserId={selectedUserId} onUserChange={onUserChange} />
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Vehicles</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Vehicle
        </button>
      </div>

      {/* Vehicle Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Make *
                </label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Toyota, Ford, BMW..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Camry, Focus, X3..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year *
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Red, Blue, Silver..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Plate
                </label>
                <input
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="ABC123"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VIN
              </label>
              <input
                type="text"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                placeholder="Vehicle Identification Number"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Road Tax Expiry
                </label>
                <input
                  type="text"
                  value={formData.registrationExpiry}
                  onChange={(e) => setFormData({ ...formData, registrationExpiry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="DD-MM-YYYY"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Expiry
                </label>
                <input
                  type="text"
                  value={formData.insuranceExpiry}
                  onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="DD-MM-YYYY"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MOT Expiry
                </label>
                <input
                  type="text"
                  value={formData.motExpiry}
                  onChange={(e) => setFormData({ ...formData, motExpiry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="DD-MM-YYYY"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Interval
                </label>
                <input
                  type="text"
                  value={formData.serviceInterval}
                  onChange={(e) => setFormData({ ...formData, serviceInterval: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="6 months, 12 months, 10,000 miles..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Service Due Date
                </label>
                <input
                  type="text"
                  value={formData.nextServiceDueDate}
                  onChange={(e) => setFormData({ ...formData, nextServiceDueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="DD-MM-YYYY"
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
                  onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="State Farm, Geico, Progressive..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insured At
                </label>
                <select
                  value={formData.insuredAt}
                  onChange={(e) => setFormData({ ...formData, insuredAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a home...</option>
                  {homes.map((home) => (
                    <option key={home._id} value={home._id}>
                      {home.nickname}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.addedToDart}
                  onChange={(e) => setFormData({ ...formData, addedToDart: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Added to Dart?
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Additional notes about this vehicle..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicle List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <div key={vehicle._id} className="bg-white p-4 rounded-lg border shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                {vehicle.color && (
                  <p className="text-sm text-gray-600">{vehicle.color}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(vehicle)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(vehicle._id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {vehicle.licensePlate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">License Plate:</span>
                  <span className="font-mono">{vehicle.licensePlate}</span>
                </div>
              )}
              
              {vehicle.vin && (
                <div className="flex justify-between">
                  <span className="text-gray-600">VIN:</span>
                  <span className="font-mono text-xs">{vehicle.vin}</span>
                </div>
              )}

              {vehicle.registrationExpiry && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Road Tax:</span>
                  <span className={getExpiryStatus(vehicle.registrationExpiry)?.color || ""}>
                    {getExpiryStatus(vehicle.registrationExpiry)?.text}
                  </span>
                </div>
              )}

              {vehicle.insuranceProvider && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Insurance:</span>
                  <span>{vehicle.insuranceProvider}</span>
                </div>
              )}

              {vehicle.insuranceExpiry && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Insurance Expiry:</span>
                  <span className={getExpiryStatus(vehicle.insuranceExpiry)?.color || ""}>
                    {getExpiryStatus(vehicle.insuranceExpiry)?.text}
                  </span>
                </div>
              )}

              {vehicle.insuredAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Insured At:</span>
                  <span>{getHomeName(vehicle.insuredAt)}</span>
                </div>
              )}

              {vehicle.motExpiry && (
                <div className="flex justify-between">
                  <span className="text-gray-600">MOT Expiry:</span>
                  <div className="flex items-center gap-2">
                    <span className={getExpiryStatus(vehicle.motExpiry)?.color || ""}>
                      {getExpiryStatus(vehicle.motExpiry)?.text}
                    </span>
                    <a
                      href="https://vehicleenquiry.service.gov.uk/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-xs underline"
                      title="Check MOT status"
                    >
                      Check Status
                    </a>
                  </div>
                </div>
              )}

              {vehicle.serviceInterval && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Interval:</span>
                  <span>{vehicle.serviceInterval}</span>
                </div>
              )}

              {vehicle.nextServiceDueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Next Service Due:</span>
                  <span className={getExpiryStatus(vehicle.nextServiceDueDate)?.color || ""}>
                    {getExpiryStatus(vehicle.nextServiceDueDate)?.text}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600">Added to Dart:</span>
                <span className={vehicle.addedToDart ? "text-green-600" : "text-gray-500"}>
                  {vehicle.addedToDart ? "Yes" : "No"}
                </span>
              </div>

              {vehicle.notes && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-gray-600 text-xs">{vehicle.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {vehicles.length === 0 && !showForm && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚗</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles yet</h3>
          <p className="text-gray-600 mb-4">Add your first vehicle to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Vehicle
          </button>
        </div>
      )}
    </div>
  );
}
