import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function ApiTest() {
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const user = useQuery(api.auth.loggedInUser);

  const makeApiCall = async (method: string, endpoint: string, body?: any) => {
    setLoading(true);
    try {
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for auth
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);
      const data = await response.json();
      
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">API Test</h2>
        <p className="text-gray-600">Please log in to test the API</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">API Test</h2>
      <p className="text-sm text-gray-600 mb-4">
        Test the HTTP API endpoints for people, vehicles, and homes
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* People API Tests */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">People API</h3>
          <button
            onClick={() => makeApiCall("GET", "/api/people")}
            disabled={loading}
            className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            GET /api/people
          </button>
          <button
            onClick={() => makeApiCall("POST", "/api/people", {
              firstName: "John",
              lastName: "Doe",
              relationship: "friend",
              email: "john@example.com"
            })}
            disabled={loading}
            className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            POST /api/people
          </button>
        </div>

        {/* Vehicles API Tests */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">Vehicles API</h3>
          <button
            onClick={() => makeApiCall("GET", "/api/vehicles")}
            disabled={loading}
            className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            GET /api/vehicles
          </button>
          <button
            onClick={() => makeApiCall("POST", "/api/vehicles", {
              make: "Toyota",
              model: "Camry",
              year: 2022,
              color: "Blue",
              licensePlate: "ABC123"
            })}
            disabled={loading}
            className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            POST /api/vehicles
          </button>
        </div>

        {/* Homes API Tests */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">Homes API</h3>
          <button
            onClick={() => makeApiCall("GET", "/api/homes")}
            disabled={loading}
            className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            GET /api/homes
          </button>
          <button
            onClick={() => makeApiCall("POST", "/api/homes", {
              nickname: "Main Home",
              address: "123 Main St",
              city: "Anytown",
              country: "USA",
              propertyType: "house",
              ownership: "owned"
            })}
            disabled={loading}
            className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            POST /api/homes
          </button>
        </div>
      </div>

      {/* Response Display */}
      <div className="mt-6">
        <h3 className="font-medium text-gray-900 mb-2">API Response:</h3>
        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">
          {loading ? "Loading..." : response || "No response yet"}
        </pre>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Available Endpoints:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div><strong>People:</strong> GET/POST /api/people, GET/PUT/DELETE /api/people/:id</div>
          <div><strong>Vehicles:</strong> GET/POST /api/vehicles, GET/PUT/DELETE /api/vehicles/:id</div>
          <div><strong>Homes:</strong> GET/POST /api/homes, GET/PUT/DELETE /api/homes/:id</div>
        </div>
      </div>
    </div>
  );
}
