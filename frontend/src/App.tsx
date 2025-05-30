import { useState, useEffect } from "react";
import "./App.css";

interface Merchant {
  id: string;
  businessName: string;
  legalName: string;
  email: string;
  phone: string;
  website?: string;
  status: string;
  createdAt: string;
}

function App() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "Sample Coffee Shop",
    legalName: "Sample Coffee Shop LLC",
    email: "sample@coffeeshop.com",
    phone: "555-123-4567",
    website: "https://samplecoffee.com",
  });

  // Get API URL from environment or default to deployed API
  const API_URL = import.meta.env.VITE_API_URL || "https://xccz9chneh.execute-api.us-east-1.amazonaws.com/dev";
  const API_TOKEN = import.meta.env.VITE_API_TOKEN || "2ad943cf309e953ae6595a6f3182e1233971322775ab33d9a0a1dfe1dbb0ae85";

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  };

  const fetchMerchants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall("/merchants");
      setMerchants(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch merchants");
    } finally {
      setLoading(false);
    }
  };

  const createMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Public endpoint - no auth required
      const response = await fetch(`${API_URL}/merchants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      setFormData({ businessName: "", legalName: "", email: "", phone: "", website: "" });
      setShowCreateForm(false);
      await fetchMerchants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create merchant");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  return (
    <div className="app">
      <div className="container">
        <h1>Merchant Management</h1>

        <div className="header-actions">
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary">
            {showCreateForm ? "Cancel" : "Add Merchant"}
          </button>
          <button onClick={fetchMerchants} disabled={loading} className="btn btn-secondary">
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {showCreateForm && (
          <form onSubmit={createMerchant} className="create-form">
            <h2>Create New Merchant</h2>
            <div className="form-group">
              <label>Business Name *</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Legal Name *</label>
              <input type="text" value={formData.legalName} onChange={(e) => setFormData({ ...formData, legalName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Website</label>
              <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? "Creating..." : "Create Merchant"}
            </button>
          </form>
        )}

        <div className="merchants-list">
          <h2>Merchants ({merchants.length})</h2>
          {loading && !showCreateForm && <p>Loading merchants...</p>}
          {merchants.length === 0 && !loading && <p>No merchants found. Create your first merchant above.</p>}
          {merchants.map((merchant) => (
            <div key={merchant.id} className="merchant-card">
              <h3>{merchant.businessName}</h3>
              <p>
                <strong>Legal Name:</strong> {merchant.legalName}
              </p>
              <p>
                <strong>Email:</strong> {merchant.email}
              </p>
              <p>
                <strong>Phone:</strong> {merchant.phone}
              </p>
              {merchant.website && (
                <p>
                  <strong>Website:</strong> {merchant.website}
                </p>
              )}
              <p>
                <strong>Status:</strong> <span className={`status ${merchant.status.toLowerCase()}`}>{merchant.status}</span>
              </p>
              <p>
                <strong>Created:</strong> {new Date(merchant.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
