'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead } from '@/lib/supabase';
import Papa from 'papaparse';

type DuplicateGroup = {
  instagram_username: string;
  leads: Lead[];
};

export default function Home() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<'TO_CONTACT' | 'FOLLOW_UP' | 'REPLIED' | 'CLIENT'>('TO_CONTACT');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ brand_name: '', instagram_username: '', website: '' });
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set());
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [leadHealth, setLeadHealth] = useState<Record<string, { reachable: boolean; status?: number }>>({});

  const logout = async () => {
    document.cookie = 'crm-auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/login');
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const found = findDuplicates(leads);
      if (found.length > 0) {
        setDuplicates(found);
        setShowDuplicateModal(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [leads]);

  useEffect(() => {
    const checkAllWebsites = async () => {
      const checksToRun = leads
        .filter(l => l.website)
        .map(async (lead) => {
          try {
            const res = await fetch('/api/check-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: lead.website }),
            });
            const data = await res.json();
            return [lead.id, { reachable: data.reachable, status: data.status }] as const;
          } catch (err) {
            return [lead.id, { reachable: false }] as const;
          }
        });

      const results = await Promise.all(checksToRun);
      const newHealth: Record<string, { reachable: boolean; status?: number }> = {};
      results.forEach(([id, health]) => {
        newHealth[id] = health;
      });
      setLeadHealth(newHealth);
    };

    const interval = setInterval(checkAllWebsites, 5000);
    checkAllWebsites();
    return () => clearInterval(interval);
  }, [leads]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const findDuplicates = (leadsToCheck: Lead[]): DuplicateGroup[] => {
    const groupedByUsername: Record<string, Lead[]> = {};
    const groupedByWebsite: Record<string, Lead[]> = {};
    const processed = new Set<string>();
    const results: DuplicateGroup[] = [];

    leadsToCheck.forEach(lead => {
      const usernameKey = lead.instagram_username.toLowerCase().trim();
      if (!groupedByUsername[usernameKey]) groupedByUsername[usernameKey] = [];
      groupedByUsername[usernameKey].push(lead);

      if (lead.website) {
        const websiteKey = lead.website.toLowerCase().trim();
        if (!groupedByWebsite[websiteKey]) groupedByWebsite[websiteKey] = [];
        groupedByWebsite[websiteKey].push(lead);
      }
    });

    // Process duplicates by instagram_username
    Object.entries(groupedByUsername).forEach(([username, group]) => {
      if (group.length > 1) {
        const key = `username:${username}`;
        if (!processed.has(key)) {
          processed.add(key);
          results.push({
            instagram_username: username,
            leads: group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
          });
        }
      }
    });

    // Process duplicates by website
    Object.entries(groupedByWebsite).forEach(([website, group]) => {
      if (group.length > 1) {
        const key = `website:${website}`;
        if (!processed.has(key)) {
          processed.add(key);
          results.push({
            instagram_username: `(Website: ${website})`,
            leads: group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
          });
        }
      }
    });

    return results;
  };

  const deleteDuplicates = async () => {
    for (const group of duplicates) {
      const toDelete = group.leads.slice(1);
      for (const lead of toDelete) {
        await deleteLead(lead.id);
      }
    }
    setDuplicates([]);
    setShowDuplicateModal(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const updated = await res.json();
      setLeads(leads.map(l => l.id === id ? updated : l));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      setLeads(leads.filter(l => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const addLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand_name || !formData.instagram_username) return;

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const newLead = await res.json();
      setLeads([newLead, ...leads]);
      setFormData({ brand_name: '', instagram_username: '', website: '' });
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCSVImport = async (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const leadsToAdd = rows
          .filter(row => row['Brand Name'] && (row['Website/Social'] || row.Website))
          .map(row => ({
            brand_name: row['Brand Name'],
            instagram_username: row['Brand Name'].toLowerCase().replace(/\s+/g, ''),
            website: row['Website/Social'] || row.Website || null,
          }));

        if (leadsToAdd.length === 0) return;

        try {
          const res = await fetch('/api/leads/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leads: leadsToAdd }),
          });
          const data = await res.json();
          const addedIds = new Set<string>(data.leads?.map((l: Lead) => l.id) || []);
          setNewLeadIds(addedIds);
          await fetchLeads();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const filteredLeads = leads.filter(l => l.status === filter);
  const stats = {
    TO_CONTACT: leads.filter(l => l.status === 'TO_CONTACT').length,
    FOLLOW_UP: leads.filter(l => l.status === 'FOLLOW_UP').length,
    REPLIED: leads.filter(l => l.status === 'REPLIED').length,
    CLIENT: leads.filter(l => l.status === 'CLIENT').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">📱 IG Lead Manager</h1>
            <p className="text-gray-600">Track your AI UGC outreach</p>
          </div>
          <div className="flex gap-2">
            <a
              href={process.env.NEXT_PUBLIC_SUPABASE_DASHBOARD_URL || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
            >
              🗄️ Database
            </a>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white rounded-lg shadow p-4 text-center relative">
            <div className="text-3xl font-bold text-blue-600">{stats.TO_CONTACT}</div>
            <div className="text-sm text-gray-600 mt-1">To Contact</div>
            {newLeadIds.size > 0 && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                +{newLeadIds.size}
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.FOLLOW_UP}</div>
            <div className="text-sm text-gray-600 mt-1">Follow Up</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.REPLIED}</div>
            <div className="text-sm text-gray-600 mt-1">Replied</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.CLIENT}</div>
            <div className="text-sm text-gray-600 mt-1">Won 🎉</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex-1 min-w-[140px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            ➕ Add Lead
          </button>
          <label className="flex-1 min-w-[140px] bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition cursor-pointer text-center">
            📥 Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleCSVImport(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>

        {/* Add Lead Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <form onSubmit={addLead} className="space-y-4">
              <input
                type="text"
                placeholder="Brand Name"
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 placeholder:text-gray-700 placeholder:font-semibold text-gray-900"
                required
              />
              <input
                type="text"
                placeholder="Instagram Username (no @)"
                value={formData.instagram_username}
                onChange={(e) => setFormData({ ...formData, instagram_username: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 placeholder:text-gray-700 placeholder:font-semibold text-gray-900"
                required
              />
              <input
                type="url"
                placeholder="Website (optional)"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 placeholder:text-gray-700 placeholder:font-semibold text-gray-900"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Status Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['TO_CONTACT', 'FOLLOW_UP', 'REPLIED', 'CLIENT'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 min-w-[100px] font-bold py-2 px-4 rounded-lg transition ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status === 'TO_CONTACT' && '📞'}
              {status === 'FOLLOW_UP' && '⏰'}
              {status === 'REPLIED' && '💬'}
              {status === 'CLIENT' && '🎉'}
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Leads List */}
        {loading ? (
          <div className="text-center text-gray-600">Loading...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center text-gray-600 bg-white rounded-lg p-8">
            No leads yet
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-lg text-gray-900">{lead.brand_name}</div>
                    {newLeadIds.has(lead.id) && (
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">NEW</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">@{lead.instagram_username}</div>
                  {lead.website && (
                    <div className="text-sm flex items-center gap-2">
                      <span className={leadHealth[lead.id]?.reachable ? '🟢' : '🔴'}>
                        {leadHealth[lead.id]?.status && `(${leadHealth[lead.id].status})`}
                      </span>
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        🔗 {lead.website}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {filter === 'TO_CONTACT' && (
                    <button
                      onClick={() => updateStatus(lead.id, 'FOLLOW_UP')}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition whitespace-nowrap"
                    >
                      Contacted ✅
                    </button>
                  )}

                  {filter === 'FOLLOW_UP' && (
                    <>
                      <button
                        onClick={() => updateStatus(lead.id, 'REPLIED')}
                        className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition whitespace-nowrap"
                      >
                        Replied ✅
                      </button>
                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition whitespace-nowrap"
                      >
                        Forget ✕
                      </button>
                    </>
                  )}

                  {filter === 'REPLIED' && (
                    <button
                      onClick={() => updateStatus(lead.id, 'CLIENT')}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition whitespace-nowrap"
                    >
                      Won 🎉
                    </button>
                  )}

                  {filter === 'CLIENT' && (
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition whitespace-nowrap"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CSV Template Info */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-sm text-gray-700">
          <strong>CSV Format:</strong> brand_name, instagram_username, website (optional)
        </div>
      </div>

      {/* Duplicate Detection Modal */}
      {showDuplicateModal && duplicates.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">⚠️ Duplicates Found</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
              {duplicates.map((group, idx) => (
                <div key={idx} className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                  <div className="font-bold text-gray-900 mb-2">@{group.instagram_username}</div>
                  <div className="space-y-2">
                    {group.leads.map((lead, leadIdx) => (
                      <div
                        key={lead.id}
                        className={`p-2 rounded text-sm ${
                          leadIdx === 0
                            ? 'bg-green-100 border-2 border-green-500'
                            : 'bg-gray-200 opacity-60'
                        }`}
                      >
                        <div className="font-semibold">{lead.brand_name}</div>
                        <div className="text-xs text-gray-600">
                          {new Date(lead.created_at).toLocaleString()}
                        </div>
                        {leadIdx === 0 && <div className="text-xs font-bold text-green-700">✓ KEEP</div>}
                        {leadIdx > 0 && <div className="text-xs font-bold text-red-700">✕ DELETE</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteDuplicates}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition"
              >
                OK, Delete Duplicates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
