import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organicApi } from '../api/organic';
import { useAuth } from '../hooks/useAuth';
import { OrganicWasteListing, OrganicWasteRequest } from '../types';
import toast from 'react-hot-toast';
import {
  Sprout, Plus, Handshake, Calendar, CheckCircle2, PackageCheck,
  AlertCircle, ShieldAlert, Clock, XCircle, ChevronDown, ChevronUp,
  Image as ImageIcon, MapPin, Phone, X, Search, Filter, Leaf,
} from 'lucide-react';

const WASTE_TYPE_OPTIONS = [
  { value: 'general', label: 'General Organic' },
  { value: 'food_scraps', label: 'Food Scraps' },
  { value: 'garden_waste', label: 'Garden & Yard Waste' },
  { value: 'compost', label: 'Processed Compost' },
  { value: 'agricultural', label: 'Agricultural Residue' },
];

const wasteTypeLabel = (val: string) =>
  WASTE_TYPE_OPTIONS.find((o) => o.value === val)?.label || val;

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending:   { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',   icon: <Clock className="w-3 h-3" />,        label: 'Pending Review' },
  approved:  { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Approved' },
  rejected:  { color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',     icon: <XCircle className="w-3 h-3" />,      label: 'Rejected' },
  completed: { color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',     icon: <CheckCircle2 className="w-3 h-3" />, label: 'Completed' },
  open:      { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: <Leaf className="w-3 h-3" />,      label: 'Open' },
  closed:    { color: 'bg-slate-600/40 text-slate-400 border-slate-600/40',  icon: <XCircle className="w-3 h-3" />,      label: 'Closed' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { color: 'bg-slate-700 text-slate-300 border-slate-600', icon: null, label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

export const OrganicWastePage: React.FC = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  // --- Admin: Create Listing State ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [listingForm, setListingForm] = useState({
    total_kg: '50',
    description: '',
    waste_type: 'general',
    pickup_location: '',
    available_until: '',
    image_base64: '',
  });
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- Resident: Request Modal State ---
  const [selectedListing, setSelectedListing] = useState<OrganicWasteListing | null>(null);
  const [requestForm, setRequestForm] = useState({ requested_kg: '', contact_info: '' });

  // --- Admin: Requests Management State ---
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // --- Queries ---
  const { data: listings = [], isLoading: isLoadingListings } = useQuery<OrganicWasteListing[]>({
    queryKey: ['organic-listings'],
    queryFn: () => organicApi.getListings(),
  });

  const { data: requests = [], isLoading: isLoadingRequests } = useQuery<OrganicWasteRequest[]>({
    queryKey: ['organic-requests'],
    queryFn: () => organicApi.getRequests(),
  });

  // --- Mutations ---
  const createListingMutation = useMutation({
    mutationFn: () => organicApi.createListing({
      total_kg: parseFloat(listingForm.total_kg),
      description: listingForm.description,
      waste_type: listingForm.waste_type,
      pickup_location: listingForm.pickup_location,
      available_until: listingForm.available_until || undefined,
      image_base64: listingForm.image_base64,
    }),
    onSuccess: (data) => {
      toast.success(data.message || 'Listing published to marketplace!');
      queryClient.invalidateQueries({ queryKey: ['organic-listings'] });
      setShowCreateModal(false);
      setListingForm({ total_kg: '50', description: '', waste_type: 'general', pickup_location: '', available_until: '', image_base64: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to create listing.'),
  });

  const createRequestMutation = useMutation({
    mutationFn: () => {
      if (!selectedListing) throw new Error('No listing selected');
      return organicApi.createRequest(selectedListing.id, {
        requested_kg: parseFloat(requestForm.requested_kg),
        contact_info: requestForm.contact_info,
      });
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Request submitted! Awaiting admin approval.');
      queryClient.invalidateQueries({ queryKey: ['organic-requests'] });
      queryClient.invalidateQueries({ queryKey: ['organic-listings'] });
      setSelectedListing(null);
      setRequestForm({ requested_kg: '', contact_info: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Request failed.'),
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, status, admin_note }: { id: string; status: 'approved' | 'rejected' | 'completed'; admin_note?: string }) =>
      organicApi.updateRequestStatus(id, { status, admin_note }),
    onSuccess: (data) => {
      toast.success(data.message || 'Request updated.');
      queryClient.invalidateQueries({ queryKey: ['organic-requests'] });
      queryClient.invalidateQueries({ queryKey: ['organic-listings'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Update failed.'),
  });

  // --- Computed Values ---
  const openListings = listings.filter((l) => l.status === 'open' && l.available_kg > 0);
  const totalDiverted = listings.reduce((sum, l) => sum + (Number(l.total_kg) - Number(l.available_kg)), 0);
  const pendingRequestCount = requests.filter((r) => r.status === 'pending').length;

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesSearch = !searchQuery ||
      (r.requester_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.listing_description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contact_info.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setListingForm((f) => ({ ...f, image_base64: reader.result as string }));
    reader.readAsDataURL(file);
  };

  // Validate & submit request
  const handleSubmitRequest = () => {
    const kg = parseFloat(requestForm.requested_kg);
    if (!selectedListing) return;
    if (isNaN(kg) || kg <= 0) { toast.error('Please enter a valid quantity.'); return; }
    if (kg > selectedListing.available_kg) {
      toast.error(`Only ${selectedListing.available_kg.toFixed(1)}kg available. Reduce your request.`); return;
    }
    if (!requestForm.contact_info.trim()) { toast.error('Please enter contact information.'); return; }
    createRequestMutation.mutate();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <Sprout className="w-4 h-4 text-emerald-400" /> Organic Waste Marketplace
            </span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-white">Organic Compost Distribution Hub</h1>
          <p className="text-xs text-slate-300">
            {role === 'admin'
              ? 'Post compost batches with pickup details. Review and approve resident requests.'
              : 'Browse available organic compost. Submit portion requests for your garden or agro-coop.'}
          </p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg hover:brightness-110 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Post New Listing
          </button>
        )}
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-semibold text-slate-400">Total Compost Distributed</span>
          <div className="text-3xl font-black text-emerald-400 mt-1">{totalDiverted.toLocaleString()} kg</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-semibold text-slate-400">Open Listings</span>
          <div className="text-3xl font-black text-teal-300 mt-1">{openListings.length} Available</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-semibold text-slate-400">
            {role === 'admin' ? 'Pending Approval Requests' : 'My Total Requests'}
          </span>
          <div className="text-3xl font-black text-cyan-300 mt-1">
            {role === 'admin' ? pendingRequestCount : requests.length}
          </div>
        </div>
      </div>

      {/* ── ADMIN: Requests Management ── */}
      {role === 'admin' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-cyan-400" /> Resident Request Management
              </h2>
              <p className="text-xs text-slate-400">Approve, reject or mark requests as completed</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-bold outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {isLoadingRequests ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-2">
              <Handshake className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="font-bold text-slate-300">No requests match your filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <div key={req.id} className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={req.status} />
                        <span className="text-xs font-bold text-slate-200">{req.requester_name}</span>
                        <span className="text-[11px] text-slate-400">{req.requester_email}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-semibold">{req.listing_description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><Leaf className="w-3 h-3 text-emerald-400" />{wasteTypeLabel(req.waste_type || '')}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{req.contact_info}</span>
                        <span className="font-bold text-emerald-400">{req.requested_kg} kg requested</span>
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => updateRequestMutation.mutate({ id: req.id, status: 'approved' })}
                          disabled={updateRequestMutation.isPending}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold hover:brightness-110 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => updateRequestMutation.mutate({ id: req.id, status: 'rejected' })}
                          disabled={updateRequestMutation.isPending}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                    {req.status === 'approved' && (
                      <button
                        onClick={() => updateRequestMutation.mutate({ id: req.id, status: 'completed' })}
                        disabled={updateRequestMutation.isPending}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 flex items-center gap-1 shrink-0"
                      >
                        <PackageCheck className="w-3.5 h-3.5" /> Mark Completed
                      </button>
                    )}
                  </div>
                  {req.admin_note && (
                    <p className="text-[11px] text-slate-400 bg-slate-900/60 rounded-xl px-3 py-1.5 border border-slate-800">
                      <strong className="text-slate-300">Note:</strong> {req.admin_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Available Listings ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
              {role === 'admin' ? 'All Listings' : 'Available Compost Listings'}
            </h2>
            <p className="text-xs text-slate-400">
              {role === 'admin'
                ? 'Overview of all posted organic waste batches'
                : 'Browse and request compost portions for your garden or community farm'}
            </p>
          </div>
        </div>

        {isLoadingListings ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading listings...</div>
        ) : listings.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-2">
            <Sprout className="w-8 h-8 text-emerald-400/50 mx-auto" />
            <p className="font-bold text-slate-300">No organic listings posted yet.</p>
            {role === 'admin' && <p>Post a new listing to start distributing compost to residents.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing) => {
              const pct = listing.total_kg > 0
                ? Math.round((listing.available_kg / listing.total_kg) * 100)
                : 0;
              const listingRequests = requests.filter((r) => r.listing_id === listing.id);
              const isExpanded = expandedListingId === listing.id;
              const isAvailable = listing.status === 'open' && listing.available_kg > 0;

              return (
                <div
                  key={listing.id}
                  className={`bg-slate-800/50 border rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all ${
                    isAvailable ? 'border-slate-700/60 hover:border-emerald-500/40' : 'border-slate-700/30 opacity-70'
                  }`}
                >
                  {/* Listing Image */}
                  {listing.image_base64 ? (
                    <div className="w-full h-32 overflow-hidden">
                      <img src={listing.image_base64} alt={listing.description} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-gradient-to-br from-emerald-900/30 to-teal-900/20 flex items-center justify-center">
                      <Sprout className="w-10 h-10 text-emerald-400/30" />
                    </div>
                  )}

                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={listing.status} />
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold">
                            {wasteTypeLabel(listing.waste_type || 'general')}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-100 line-clamp-2">{listing.description}</p>
                      </div>
                    </div>

                    {listing.pickup_location && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{listing.pickup_location}</span>
                      </div>
                    )}

                    {listing.available_until && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Available until: {new Date(listing.available_until).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Availability Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">Available:</span>
                        <span className="text-emerald-400">{listing.available_kg} / {listing.total_kg} kg</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex-1" />

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        {new Date(listing.created_at).toLocaleDateString()}
                      </span>

                      {/* Admin: expand to see requests */}
                      {role === 'admin' && (
                        <button
                          onClick={() => setExpandedListingId(isExpanded ? null : listing.id)}
                          className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                        >
                          {listingRequests.length} Requests
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}

                      {/* Resident: Request button */}
                      {role === 'resident' && isAvailable && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedListing(listing);
                            setRequestForm({ requested_kg: String(Math.min(10, listing.available_kg)), contact_info: '' });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs shadow-md hover:brightness-110 flex items-center gap-1.5"
                        >
                          <Handshake className="w-3.5 h-3.5" /> Request
                        </button>
                      )}
                      {role === 'resident' && !isAvailable && (
                        <span className="text-[11px] text-slate-500 font-bold">Unavailable</span>
                      )}
                    </div>

                    {/* Admin: Inline Requests Panel */}
                    {role === 'admin' && isExpanded && listingRequests.length > 0 && (
                      <div className="mt-2 pt-3 border-t border-slate-700/50 space-y-2">
                        {listingRequests.map((req) => (
                          <div key={req.id} className="bg-slate-900/60 rounded-xl p-2.5 space-y-1.5 border border-slate-800">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-bold text-slate-200">{req.requester_name}</p>
                                <p className="text-[11px] text-emerald-400 font-extrabold">{req.requested_kg} kg</p>
                              </div>
                              <StatusBadge status={req.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RESIDENT: My Requests ── */}
      {role === 'resident' && requests.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <Handshake className="w-5 h-5 text-teal-400" /> My Compost Requests
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3">Listing</th>
                  <th className="p-3">Waste Type</th>
                  <th className="p-3">Qty Requested</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-slate-200 max-w-[200px]">
                      <p className="line-clamp-2">{req.listing_description || '—'}</p>
                      {req.pickup_location && (
                        <p className="text-[11px] text-teal-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />{req.pickup_location}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">{wasteTypeLabel(req.waste_type || '')}</td>
                    <td className="p-3 font-extrabold text-emerald-400">{req.requested_kg} kg</td>
                    <td className="p-3 text-slate-300 text-[11px]">{req.contact_info}</td>
                    <td className="p-3"><StatusBadge status={req.status} /></td>
                    <td className="p-3 text-slate-400">{new Date(req.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: Resident Request Form ── */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
                <Handshake className="w-5 h-5 text-emerald-400" /> Request Compost
              </h3>
              <button onClick={() => setSelectedListing(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
              <p className="text-xs font-bold text-slate-200">{selectedListing.description}</p>
              <p className="text-xs text-emerald-400 font-extrabold">
                {selectedListing.available_kg} kg available out of {selectedListing.total_kg} kg
              </p>
              {selectedListing.pickup_location && (
                <p className="text-[11px] text-teal-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {selectedListing.pickup_location}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Amount to Request (kg)</label>
                <input
                  type="number"
                  min="0.1"
                  max={selectedListing.available_kg}
                  step="0.1"
                  value={requestForm.requested_kg}
                  onChange={(e) => setRequestForm((f) => ({ ...f, requested_kg: e.target.value }))}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400">Max: {selectedListing.available_kg} kg</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Your Contact Information</label>
                <input
                  type="text"
                  value={requestForm.contact_info}
                  onChange={(e) => setRequestForm((f) => ({ ...f, contact_info: e.target.value }))}
                  placeholder="Phone number or preferred contact method"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedListing(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >Cancel</button>
              <button
                onClick={handleSubmitRequest}
                disabled={createRequestMutation.isPending}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold hover:brightness-110 disabled:opacity-50"
              >
                {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Admin Create Listing ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" /> Post Organic Batch Listing
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Total Quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={listingForm.total_kg}
                    onChange={(e) => setListingForm((f) => ({ ...f, total_kg: e.target.value }))}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Waste Type</label>
                  <select
                    value={listingForm.waste_type}
                    onChange={(e) => setListingForm((f) => ({ ...f, waste_type: e.target.value }))}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {WASTE_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={listingForm.description}
                  onChange={(e) => setListingForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="High-nitrogen coffee grounds & vegetable compost. Rich in organic matter."
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Pickup Location</label>
                <input
                  type="text"
                  value={listingForm.pickup_location}
                  onChange={(e) => setListingForm((f) => ({ ...f, pickup_location: e.target.value }))}
                  placeholder="Sector 4 Municipal Composting Center, Warehouse B"
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Available Until (optional)</label>
                <input
                  type="datetime-local"
                  value={listingForm.available_until}
                  onChange={(e) => setListingForm((f) => ({ ...f, available_until: e.target.value }))}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="text-xs font-bold text-slate-300">Listing Photo (optional, max 2MB)</label>
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="mt-1 w-full h-24 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-emerald-500/60 transition-colors bg-slate-800/40"
                >
                  {listingForm.image_base64 ? (
                    <img src={listingForm.image_base64} alt="Preview" className="h-full object-contain rounded-xl" />
                  ) : (
                    <div className="text-center text-slate-400 text-xs">
                      <ImageIcon className="w-5 h-5 mx-auto mb-1" />
                      <span>Click to upload photo</span>
                    </div>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {listingForm.image_base64 && (
                  <button
                    onClick={() => setListingForm((f) => ({ ...f, image_base64: '' }))}
                    className="mt-1 text-[11px] text-rose-400 hover:text-rose-300"
                  >Remove image</button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >Cancel</button>
              <button
                onClick={() => {
                  if (!listingForm.description || !listingForm.total_kg) {
                    toast.error('Please fill in description and quantity.');
                    return;
                  }
                  if (!listingForm.pickup_location) {
                    toast.error('Please enter a pickup location.');
                    return;
                  }
                  createListingMutation.mutate();
                }}
                disabled={createListingMutation.isPending}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold hover:brightness-110 disabled:opacity-50"
              >
                {createListingMutation.isPending ? 'Publishing...' : 'Publish Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
