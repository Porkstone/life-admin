import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { formatDateForDisplay, formatDateFromInput, isValidDateFormat } from "./lib/utils";

interface PersonFormProps {
  personId?: Id<"people"> | null;
  onClose: () => void;
  ownerId?: Id<"users"> | null;
}

export function PersonForm({ personId, onClose, ownerId }: PersonFormProps) {
  const person = useQuery(api.people.get, personId ? { personId } : "skip");
  const createPerson = useMutation(api.people.create);
  const updatePerson = useMutation(api.people.update);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    relationship: "self",
    dateOfBirth: "",
    email: "",
    phone: "",
    drivingLicenseNumber: "",
    drivingLicenseDate: "",
    passportNumber: "",
    passportExpiryDate: "",
    nationalInsuranceNumber: "",
    nhsNumber: "",
    notes: "",
  });

  useEffect(() => {
    if (person) {
      setFormData({
        firstName: person.firstName,
        lastName: person.lastName,
        relationship: person.relationship,
        dateOfBirth: formatDateForDisplay(person.dateOfBirth || ""),
        email: person.email || "",
        phone: person.phone || "",
        drivingLicenseNumber: person.drivingLicenseNumber || "",
        drivingLicenseDate: formatDateForDisplay(person.drivingLicenseDate || ""),
        passportNumber: person.passportNumber || "",
        passportExpiryDate: formatDateForDisplay(person.passportExpiryDate || ""),
        nationalInsuranceNumber: person.nationalInsuranceNumber || "",
        nhsNumber: person.nhsNumber || "",
        notes: person.notes || "",
      });
    }
  }, [person]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate date formats
    if (formData.dateOfBirth && !isValidDateFormat(formData.dateOfBirth)) {
      toast.error("Please enter date of birth in DD/MM/YYYY format");
      return;
    }
    if (formData.drivingLicenseDate && !isValidDateFormat(formData.drivingLicenseDate)) {
      toast.error("Please enter driving license date in DD/MM/YYYY format");
      return;
    }
    if (formData.passportExpiryDate && !isValidDateFormat(formData.passportExpiryDate)) {
      toast.error("Please enter passport expiry date in DD/MM/YYYY format");
      return;
    }
    
    try {
      const data = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? formatDateFromInput(formData.dateOfBirth) : undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        drivingLicenseNumber: formData.drivingLicenseNumber || undefined,
        drivingLicenseDate: formData.drivingLicenseDate ? formatDateFromInput(formData.drivingLicenseDate) : undefined,
        passportNumber: formData.passportNumber || undefined,
        passportExpiryDate: formData.passportExpiryDate ? formatDateFromInput(formData.passportExpiryDate) : undefined,
        nationalInsuranceNumber: formData.nationalInsuranceNumber || undefined,
        nhsNumber: formData.nhsNumber || undefined,
        notes: formData.notes || undefined,
      };

      if (personId) {
        await updatePerson({ id: personId, ...data });
        toast.success("Person updated successfully");
      } else {
        await createPerson({ ...data, ownerId: ownerId || undefined });
        toast.success("Person added successfully");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save person");
      console.error(error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">
          {personId ? "Edit Person" : "Add New Person"}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Relationship *
          </label>
          <select
            name="relationship"
            value={formData.relationship}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="self">Self</option>
            <option value="spouse">Spouse/Partner</option>
            <option value="child">Child</option>
            <option value="parent">Parent</option>
            <option value="sibling">Sibling</option>
            <option value="friend">Friend</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              type="text"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="dd/mm/yyyy"
            />
            <p className="text-xs text-gray-500 mt-1">UK format (DD/MM/YYYY)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driving License Number
            </label>
            <input
              type="text"
              name="drivingLicenseNumber"
              value={formData.drivingLicenseNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Issue Date
            </label>
            <input
              type="text"
              name="drivingLicenseDate"
              value={formData.drivingLicenseDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="dd/mm/yyyy"
            />
            <p className="text-xs text-gray-500 mt-1">UK format (DD/MM/YYYY)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passport Number
            </label>
            <input
              type="text"
              name="passportNumber"
              value={formData.passportNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passport Expiry Date
            </label>
            <input
              type="text"
              name="passportExpiryDate"
              value={formData.passportExpiryDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="dd/mm/yyyy"
            />
            <p className="text-xs text-gray-500 mt-1">UK format (DD/MM/YYYY)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              National Insurance No.
            </label>
            <input
              type="text"
              name="nationalInsuranceNumber"
              value={formData.nationalInsuranceNumber}
              onChange={handleChange}
              placeholder="e.g., AB123456C"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NHS Number
            </label>
            <input
              type="text"
              name="nhsNumber"
              value={formData.nhsNumber}
              onChange={handleChange}
              placeholder="e.g., 123 456 7890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            placeholder="Any additional notes..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            {personId ? "Update Person" : "Add Person"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
