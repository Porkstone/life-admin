import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

interface DocumentManagerProps {
  personId: Id<"people">;
}

export function DocumentManager({ personId }: DocumentManagerProps) {
  const documents = useQuery(api.documents.listByPerson, { personId }) || [];
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveDocument = useMutation(api.documents.create);
  const removeDocument = useMutation(api.documents.remove);

  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("passport");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Step 1: Get upload URL
      const postUrl = await generateUploadUrl();

      // Step 2: Upload file
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const json = await result.json();
      if (!result.ok) {
        throw new Error(`Upload failed: ${JSON.stringify(json)}`);
      }

      // Step 3: Save document record
      await saveDocument({
        personId,
        documentType,
        fileName: file.name,
        fileId: json.storageId,
      });

      toast.success("Document uploaded successfully");
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Failed to upload document");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: Id<"documents">) => {
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await removeDocument({ id: documentId });
        toast.success("Document deleted successfully");
      } catch (error) {
        toast.error("Failed to delete document");
        console.error(error);
      }
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      passport: "🛂",
      driving_license: "🚗",
      birth_certificate: "📋",
      other: "📄",
    };
    return icons[type] || icons.other;
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Documents</h4>
      
      {/* Upload Form */}
      <div className="bg-gray-50 p-3 rounded-md">
        <div className="flex gap-2 mb-2">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="passport">Passport</option>
            <option value="driving_license">Driving License</option>
            <option value="birth_certificate">Birth Certificate</option>
            <option value="other">Other</option>
          </select>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept="image/*,.pdf"
            disabled={uploading}
            className="flex-1 text-sm"
          />
        </div>
        {uploading && (
          <div className="text-xs text-blue-600">Uploading...</div>
        )}
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc._id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
            <div className="flex items-center gap-2">
              <span>{getDocumentTypeIcon(doc.documentType)}</span>
              <div>
                <p className="text-sm font-medium">{doc.fileName}</p>
                <p className="text-xs text-gray-500">
                  {doc.documentType.replace("_", " ")} • {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  title="View"
                >
                  👁️
                </a>
              )}
              <button
                onClick={() => handleDeleteDocument(doc._id)}
                className="text-red-600 hover:text-red-800 text-sm"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-2">
            No documents uploaded yet
          </p>
        )}
      </div>
    </div>
  );
}
