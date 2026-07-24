import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { PersonForm } from "./PersonForm";
import { PersonCard } from "./PersonCard";
import { UserSelector } from "./UserSelector";
import { Id } from "../convex/_generated/dataModel";

interface PeopleManagerProps {
  selectedUserId: Id<"users"> | null;
  onUserChange: (userId: Id<"users"> | null) => void;
}

export function PeopleManager({ selectedUserId, onUserChange }: PeopleManagerProps) {
  const people = useQuery(api.people.list, selectedUserId ? { ownerId: selectedUserId } : {}) || [];
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Id<"people"> | null>(null);

  const handleEdit = (personId: Id<"people">) => {
    setEditingPerson(personId);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPerson(null);
  };

  return (
    <div className="space-y-6">
      <UserSelector selectedUserId={selectedUserId} onUserChange={onUserChange} />
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">People</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Person
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <PersonForm
              personId={editingPerson}
              onClose={handleCloseForm}
              ownerId={selectedUserId}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {people.map((person) => (
          <PersonCard
            key={person._id}
            person={person}
            onEdit={() => handleEdit(person._id)}
          />
        ))}
      </div>

      {people.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No people added yet</p>
          <p className="text-gray-400">Click "Add Person" to get started</p>
        </div>
      )}
    </div>
  );
}
