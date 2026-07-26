import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function InviteManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(["people"]);
  const [expiresInDays, setExpiresInDays] = useState(7);
  
  const createInvite = useMutation(api.invites.createInvite);
  const deleteInvite = useMutation(api.invites.deleteInvite);
  const revokeAccess = useMutation(api.invites.revokeAccess);
  
  const myInvites = useQuery(api.invites.listMyInvites) || [];
  const sharedAccess = useQuery(api.invites.listSharedAccess);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (permissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }
    
    try {
      const result = await createInvite({
        permissions,
        expiresInDays,
      });
      
      const inviteUrl = `${window.location.origin}/invite/${result.token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link created and copied to clipboard!");
      
      setShowCreateForm(false);
      setPermissions(["people"]);
      setExpiresInDays(7);
    } catch (error) {
      toast.error("Failed to create invite");
      console.error(error);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      await deleteInvite({ inviteId: inviteId as any });
      toast.success("Invite deleted");
    } catch (error) {
      toast.error("Failed to delete invite");
      console.error(error);
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    try {
      await revokeAccess({ accessId: accessId as any });
      toast.success("Access revoked");
    } catch (error) {
      toast.error("Failed to revoke access");
      console.error(error);
    }
  };

  const permissionOptions = [
    { value: "people", label: "👥 People" },
    { value: "vehicles", label: "🚗 Vehicles" },
    { value: "homes", label: "🏠 Homes" },
    { value: "documents", label: "📄 Documents" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Invite & Access Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Invite Link
        </button>
      </div>

      {/* Create Invite Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg border shadow-xs">
          <h3 className="text-lg font-semibold mb-4">Create Invite Link</h3>
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="space-y-2">
                {permissionOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={permissions.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPermissions([...permissions, option.value]);
                        } else {
                          setPermissions(permissions.filter(p => p !== option.value));
                        }
                      }}
                      className="mr-2"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expires in (days)
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Invite
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Invites */}
      <div className="bg-white p-6 rounded-lg border shadow-xs">
        <h3 className="text-lg font-semibold mb-4">My Invite Links</h3>
        {myInvites.length === 0 ? (
          <p className="text-gray-500">No invites created yet</p>
        ) : (
          <div className="space-y-3">
            {myInvites.map((invite) => (
              <div key={invite._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {invite.permissions.map(p => permissionOptions.find(opt => opt.value === p)?.label).join(", ")}
                    </span>
                    {invite.isExpired && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Expired</span>
                    )}
                    {invite.isUsed && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Used</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                  {invite.isUsed && invite.acceptedAt && (
                    <p className="text-xs text-gray-500">
                      Accepted: {new Date(invite.acceptedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!invite.isUsed && !invite.isExpired && (
                    <button
                      onClick={async () => {
                        const inviteUrl = `${window.location.origin}/invite/${invite.token}`;
                        await navigator.clipboard.writeText(inviteUrl);
                        toast.success("Invite link copied to clipboard!");
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded hover:bg-blue-200 transition-colors"
                    >
                      Copy Link
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteInvite(invite._id)}
                    className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared Access */}
      {sharedAccess && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* People with access to my data */}
          <div className="bg-white p-6 rounded-lg border shadow-xs">
            <h3 className="text-lg font-semibold mb-4">People with access to my data</h3>
            {sharedAccess.sharedWithOthers.length === 0 ? (
              <p className="text-gray-500">No one has access to your data yet</p>
            ) : (
              <div className="space-y-3">
                {sharedAccess.sharedWithOthers.map((access) => (
                  <div key={access._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{access.sharedUser?.name || "Unknown User"}</p>
                      <p className="text-sm text-gray-500">{access.sharedUser?.email}</p>
                      <p className="text-xs text-gray-500">
                        Permissions: {access.permissions.join(", ")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeAccess(access._id)}
                      className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200 transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data I have access to */}
          <div className="bg-white p-6 rounded-lg border shadow-xs">
            <h3 className="text-lg font-semibold mb-4">Data I have access to</h3>
            {sharedAccess.sharedWithMe.length === 0 ? (
              <p className="text-gray-500">You don't have access to anyone else's data yet</p>
            ) : (
              <div className="space-y-3">
                {sharedAccess.sharedWithMe.map((access) => (
                  <div key={access._id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{access.ownerUser?.name || "Unknown User"}</p>
                    <p className="text-sm text-gray-500">{access.ownerUser?.email}</p>
                    <p className="text-xs text-gray-500">
                      Permissions: {access.permissions.join(", ")}
                    </p>
                    <p className="text-xs text-gray-500">
                      Granted: {new Date(access.grantedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
