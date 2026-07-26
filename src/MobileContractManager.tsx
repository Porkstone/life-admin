import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";
import { UserSelector } from "./UserSelector";
import { Copy } from "lucide-react";

interface MobileContractManagerProps {
  selectedUserId: Id<"users"> | null;
  onUserChange: (userId: Id<"users"> | null) => void;
}

export function MobileContractManager({ selectedUserId, onUserChange }: MobileContractManagerProps) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const effectiveUserId = selectedUserId || loggedInUser?._id;
  const contracts = useQuery(api.mobileContracts.list, effectiveUserId ? { userId: effectiveUserId } : "skip");
  const setContractArchived = useMutation(api.mobileContracts.setArchived);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [archivingContractId, setArchivingContractId] = useState<Id<"mobileContracts"> | null>(null);
  const visibleContracts = contracts?.filter((contract) => showArchived || !contract.archived);

  if (!effectiveUserId) {
    return <div>Loading...</div>;
  }

  const handleEdit = (contract: any) => {
    setEditingContract(contract);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingContract(null);
  };

  const handleCopyPassword = async (password?: string) => {
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      toast.success("Account password copied to clipboard");
    } catch (error) {
      toast.error("Could not copy the account password");
      console.error(error);
    }
  };

  const handleArchiveChange = async (id: Id<"mobileContracts">, archived: boolean) => {
    setArchivingContractId(id);

    try {
      await setContractArchived({ id, archived });
      toast.success(archived ? "Mobile contract archived" : "Mobile contract restored");
    } catch (error) {
      toast.error(archived ? "Could not archive the contract" : "Could not restore the contract");
      console.error(error);
    } finally {
      setArchivingContractId(null);
    }
  };

  const calculateDaysUntilEnd = (contractEndDate: string | undefined) => {
    if (!contractEndDate) return null;
    
    const endDate = new Date(contractEndDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const formatDaysUntilEnd = (days: number | null) => {
    if (days === null) return "Not set";
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return "Expires today";
    if (days === 1) return "1 day remaining";
    return `${days} days remaining`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mobile Contracts</h2>
          <p className="text-gray-600">Manage mobile phone contracts and accounts</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium text-gray-700">Show Archived</span>
            <IosToggle
              checked={showArchived}
              onChange={setShowArchived}
              ariaLabel="Show archived mobile contracts"
            />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Contract
          </button>
        </div>
      </div>

      <UserSelector
        selectedUserId={selectedUserId}
        onUserChange={onUserChange}
      />

      {contracts === undefined ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No mobile contracts yet</h3>
          <p className="text-gray-600 mb-4">Add your first mobile contract to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Contract
          </button>
        </div>
      ) : visibleContracts?.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <h3 className="text-lg font-medium text-gray-900">No active mobile contracts</h3>
          <p className="mt-1 text-sm text-gray-600">Turn on Show Archived to view archived contracts.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleContracts?.map((contract) => {
            const daysUntilEnd = calculateDaysUntilEnd(contract.contractEndDate);
            const isExpiringSoon = daysUntilEnd !== null && daysUntilEnd <= 30 && daysUntilEnd >= 0;
            const isExpired = daysUntilEnd !== null && daysUntilEnd < 0;
            
            return (
              <div
                key={contract._id}
                className={`rounded-lg border p-6 transition-shadow hover:shadow-md ${
                  contract.archived ? "border-gray-300 bg-gray-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">📱</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{contract.provider}</h3>
                        {contract.archived && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{contract.phoneNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(contract)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Cost:</span>
                    <span className="text-sm font-medium">£{contract.monthlyCost}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Contract Type:</span>
                    <span className="text-sm font-medium capitalize">{contract.contractType.replace('_', ' ')}</span>
                  </div>

                  {contract.dataAllowance && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Data:</span>
                      <span className="text-sm font-medium">{contract.dataAllowance}</span>
                    </div>
                  )}

                  {contract.contractEndDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Contract End:</span>
                      <span className={`text-sm font-medium ${
                        isExpired ? 'text-red-600' : 
                        isExpiringSoon ? 'text-orange-600' : 
                        'text-gray-900'
                      }`}>
                        {formatDaysUntilEnd(daysUntilEnd)}
                      </span>
                    </div>
                  )}

                  {contract.registeredAt && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Registered At:</span>
                      <span className="text-sm font-medium">Home Address</span>
                    </div>
                  )}

                  {contract.accountPassword && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Account Password:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(contract.accountPassword)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        aria-label={`Copy ${contract.provider} account password`}
                        title="Copy account password"
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  {contract.notes && (
                    <div className="pt-2">
                      <p className="text-sm text-gray-600">{contract.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                    <span className="text-sm font-medium text-gray-700">Archive</span>
                    <IosToggle
                      checked={Boolean(contract.archived)}
                      onChange={(archived) => handleArchiveChange(contract._id, archived)}
                      ariaLabel={`${contract.archived ? "Restore" : "Archive"} ${contract.provider} mobile contract`}
                      disabled={archivingContractId === contract._id}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <MobileContractForm
          contract={editingContract}
          userId={effectiveUserId}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

interface IosToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
}

function IosToggle({ checked, onChange, ariaLabel, disabled = false }: IosToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`block h-6 w-6 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 ease-out ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

interface MobileContractFormProps {
  contract?: any;
  userId: Id<"users">;
  onClose: () => void;
}

function MobileContractForm({ contract, userId, onClose }: MobileContractFormProps) {
  const createContract = useMutation(api.mobileContracts.create);
  const updateContract = useMutation(api.mobileContracts.update);
  const deleteContract = useMutation(api.mobileContracts.remove);
  const homes = useQuery(api.homes.list, { ownerId: userId });

  const [formData, setFormData] = useState({
    provider: contract?.provider || "",
    phoneNumber: contract?.phoneNumber || "",
    monthlyCost: contract?.monthlyCost || 0,
    contractType: contract?.contractType || "pay_monthly",
    accountUsername: contract?.accountUsername || "",
    accountPassword: contract?.accountPassword || "",
    registeredAt: contract?.registeredAt || "",
    contractStartDate: contract?.contractStartDate || "",
    contractEndDate: contract?.contractEndDate || "",
    dataAllowance: contract?.dataAllowance || "",
    notes: contract?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const contractData = {
        ...formData,
        monthlyCost: Number(formData.monthlyCost),
        registeredAt: formData.registeredAt || undefined,
        accountUsername: formData.accountUsername || undefined,
        accountPassword: formData.accountPassword || undefined,
        contractStartDate: formData.contractStartDate || undefined,
        contractEndDate: formData.contractEndDate || undefined,
        dataAllowance: formData.dataAllowance || undefined,
        notes: formData.notes || undefined,
      };

      if (contract) {
        await updateContract({
          id: contract._id,
          ...contractData,
        });
        toast.success("Mobile contract updated successfully");
      } else {
        await createContract({
          ...contractData,
        });
        toast.success("Mobile contract added successfully");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save mobile contract");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!contract) return;
    
    if (confirm("Are you sure you want to delete this mobile contract?")) {
      try {
        await deleteContract({ id: contract._id });
        toast.success("Mobile contract deleted successfully");
        onClose();
      } catch (error) {
        toast.error("Failed to delete mobile contract");
        console.error(error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">
              {contract ? "Edit Mobile Contract" : "Add Mobile Contract"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider *
                </label>
                <input
                  type="text"
                  required
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., EE, O2, Vodafone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., +44 7123 456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Cost (£) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.monthlyCost}
                  onChange={(e) => setFormData({ ...formData, monthlyCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Type *
                </label>
                <select
                  required
                  value={formData.contractType}
                  onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pay_monthly">Pay Monthly</option>
                  <option value="pay_as_you_go">Pay As You Go</option>
                  <option value="sim_only">SIM Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Allowance
                </label>
                <input
                  type="text"
                  value={formData.dataAllowance}
                  onChange={(e) => setFormData({ ...formData, dataAllowance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Unlimited, 50GB"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registered At
                </label>
                <select
                  value={formData.registeredAt}
                  onChange={(e) => setFormData({ ...formData, registeredAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a home</option>
                  {homes?.map((home) => (
                    <option key={home._id} value={home._id}>
                      {home.nickname}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Start Date
                </label>
                <input
                  type="date"
                  value={formData.contractStartDate}
                  onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract End Date
                </label>
                <input
                  type="date"
                  value={formData.contractEndDate}
                  onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Username
                </label>
                <input
                  type="text"
                  value={formData.accountUsername}
                  onChange={(e) => setFormData({ ...formData, accountUsername: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Password
                </label>
                <input
                  type="password"
                  value={formData.accountPassword}
                  onChange={(e) => setFormData({ ...formData, accountPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes about this contract..."
              />
            </div>

            <div className="flex justify-between pt-4">
              <div>
                {contract && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Delete Contract
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {contract ? "Update Contract" : "Add Contract"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
