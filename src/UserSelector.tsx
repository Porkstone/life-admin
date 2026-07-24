import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface UserSelectorProps {
  selectedUserId: Id<"users"> | null;
  onUserChange: (userId: Id<"users"> | null) => void;
}

export function UserSelector({ selectedUserId, onUserChange }: UserSelectorProps) {
  const accessibleUsers = useQuery(api.people.getAccessibleUsers) || [];
  const currentUser = useQuery(api.auth.loggedInUser);

  if (!currentUser || accessibleUsers.length <= 1) {
    return null;
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Viewing data for:
      </label>
      <select
        value={selectedUserId || currentUser._id}
        onChange={(e) => onUserChange(e.target.value === currentUser._id ? null : e.target.value as Id<"users">)}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {accessibleUsers.map((user) => (
          <option key={user.userId} value={user.userId}>
            {user.name} {user.userId === currentUser._id ? "(Me)" : ""}
            {user.permissions.length < 4 && (
              ` - Limited access (${user.permissions.join(", ")})`
            )}
          </option>
        ))}
      </select>
    </div>
  );
}
