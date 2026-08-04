import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { DocumentManager } from "./DocumentManager";
import { toast } from "sonner";
import { formatDateForDisplay, getBirthdayInfo, getDaysUntilDate } from "./lib/utils";

interface PersonCardProps {
  person: {
    _id: Id<"people">;
    firstName: string;
    lastName: string;
    relationship: string;
    dateOfBirth?: string;
    email?: string;
    phone?: string;
    drivingLicenseNumber?: string;
    drivingLicenseDate?: string;
    drivingLicenseExpiryDate?: string;
    passportNumber?: string;
    passportExpiryDate?: string;
    nationalInsuranceNumber?: string;
    nhsNumber?: string;
    lifeInsuranceProvider?: string;
    lifeInsuranceCover?: number;
    lifeInsurancePolicyNumber?: string;
    lifeInsuranceExpiryDate?: string;
    notes?: string;
  };
  onEdit: () => void;
}

export function PersonCard({ person, onEdit }: PersonCardProps) {
  const [showDocuments, setShowDocuments] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const removePerson = useMutation(api.people.remove);
  const licenseDaysRemaining = person.drivingLicenseExpiryDate
    ? getDaysUntilDate(person.drivingLicenseExpiryDate)
    : null;

  const getLicenseExpiryLabel = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      const daysOverdue = Math.abs(daysRemaining);
      return `License expired ${daysOverdue} ${daysOverdue === 1 ? "day" : "days"} ago`;
    }
    if (daysRemaining === 0) return "License expires today";
    if (daysRemaining === 1) return "License expires tomorrow";
    return `License expires in ${daysRemaining} days`;
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${person.firstName} ${person.lastName}? This will also delete all associated documents.`)) {
      try {
        await removePerson({ id: person._id });
        toast.success("Person deleted successfully");
      } catch (error) {
        toast.error("Failed to delete person");
        console.error(error);
      }
    }
  };

  const getRelationshipColor = (relationship: string) => {
    const colors: Record<string, string> = {
      self: "bg-blue-100 text-blue-800",
      spouse: "bg-pink-100 text-pink-800",
      child: "bg-green-100 text-green-800",
      parent: "bg-purple-100 text-purple-800",
      sibling: "bg-yellow-100 text-yellow-800",
      friend: "bg-orange-100 text-orange-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[relationship] || colors.other;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {person.firstName} {person.lastName}
          </h3>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRelationshipColor(person.relationship)}`}>
            {person.relationship}
          </span>
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
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {person.dateOfBirth && (() => {
          const birthdayInfo = getBirthdayInfo(person.dateOfBirth);
          if (birthdayInfo) {
            const { dayMonth, daysUntilBirthday } = birthdayInfo;
            return (
              <p>
                <span className="font-medium">Birthday:</span> {dayMonth}
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {daysUntilBirthday === 0 ? "Today! 🎉" : 
                   daysUntilBirthday === 1 ? "Tomorrow!" :
                   `${daysUntilBirthday} days`}
                </span>
              </p>
            );
          }
          return null;
        })()}
        {person.email && (
          <p><span className="font-medium">Email:</span> {person.email}</p>
        )}
        {person.phone && (
          <p><span className="font-medium">Phone:</span> {person.phone}</p>
        )}
        {licenseDaysRemaining !== null && licenseDaysRemaining < 90 && (
          <p
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              licenseDaysRemaining < 0
                ? "bg-red-100 text-red-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {getLicenseExpiryLabel(licenseDaysRemaining)}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
        >
          {showDetails ? "Hide Details" : "Show Details"}
        </button>
        <button
          onClick={() => setShowDocuments(!showDocuments)}
          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
        >
          Documents
        </button>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t space-y-2 text-sm text-gray-600">
          {person.drivingLicenseNumber && (
            <p><span className="font-medium">License #:</span> {person.drivingLicenseNumber}</p>
          )}
          {person.drivingLicenseDate && (
            <p><span className="font-medium">License Date:</span> {formatDateForDisplay(person.drivingLicenseDate)}</p>
          )}
          {person.drivingLicenseExpiryDate && (
            <p><span className="font-medium">License Expires:</span> {formatDateForDisplay(person.drivingLicenseExpiryDate)}</p>
          )}
          {person.passportNumber && (
            <p><span className="font-medium">Passport #:</span> {person.passportNumber}</p>
          )}
          {person.passportExpiryDate && (
            <p><span className="font-medium">Passport Expires:</span> {formatDateForDisplay(person.passportExpiryDate)}</p>
          )}
          {person.nationalInsuranceNumber && (
            <p><span className="font-medium">National Insurance No.:</span> {person.nationalInsuranceNumber}</p>
          )}
          {person.nhsNumber && (
            <p><span className="font-medium">NHS Number:</span> {person.nhsNumber}</p>
          )}
          {(person.lifeInsuranceProvider || person.lifeInsuranceCover || person.lifeInsurancePolicyNumber || person.lifeInsuranceExpiryDate) && (
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="mb-2 font-semibold text-blue-900">Life Insurance</p>
              {person.lifeInsuranceProvider && (
                <p><span className="font-medium">Provider:</span> {person.lifeInsuranceProvider}</p>
              )}
              {person.lifeInsuranceCover !== undefined && (
                <p><span className="font-medium">Cover:</span> {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(person.lifeInsuranceCover)}</p>
              )}
              {person.lifeInsurancePolicyNumber && (
                <p><span className="font-medium">Policy Number:</span> {person.lifeInsurancePolicyNumber}</p>
              )}
              {person.lifeInsuranceExpiryDate && (
                <p><span className="font-medium">Expiry Date:</span> {formatDateForDisplay(person.lifeInsuranceExpiryDate)}</p>
              )}
            </div>
          )}
          {person.notes && (
            <p><span className="font-medium">Notes:</span> {person.notes}</p>
          )}
        </div>
      )}

      {showDocuments && (
        <div className="mt-3 pt-3 border-t">
          <DocumentManager personId={person._id} />
        </div>
      )}
    </div>
  );
}
