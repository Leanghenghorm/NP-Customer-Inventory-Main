import React, { useEffect, useState } from 'react';
import { Customer } from '../types';
import { Search, Plus, MoreVertical, ExternalLink, X, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn, safeFetch } from '../lib/utils';

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', logo: '', notes: '' });
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'clone', id: string } | null>(null);

  const fetchCustomers = (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    safeFetch<Customer[]>('/api/customers', { signal })
      .then(data => {
        setCustomers(data || []);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch customers:', err);
        setError(err.message || 'Failed to load customers. Please try again later.');
        setLoading(false);
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchCustomers(controller.signal);
    return () => controller.abort();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const url = event.target?.result as string;
      setFormData({ ...formData, logo: url });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
    const method = editingCustomer ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({ name: '', logo: '', notes: '' });
    fetchCustomers();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    fetchCustomers();
    setConfirmAction(null);
  };

  const handleClone = async (id: string) => {
    await fetch(`/api/customers/${id}/clone`, { method: 'POST' });
    fetchCustomers();
    setConfirmAction(null);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ name: customer.name, logo: customer.logo, notes: customer.notes });
    setIsModalOpen(true);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Customers</h1>
          <p className="text-zinc-500">Manage security infrastructure clients</p>
        </div>
        <button 
          onClick={() => { setEditingCustomer(null); setFormData({ name: '', logo: '', notes: '' }); setIsModalOpen(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="p-8 text-zinc-500 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading customers...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center space-y-4">
          <div className="text-red-500 font-bold">Error Loading Customers</div>
          <p className="text-zinc-500 text-sm">{error}</p>
          <button 
            onClick={() => fetchCustomers()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all text-sm font-medium"
          >
            Retry
          </button>
        </div>
      ) : (
        /* Customer Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCustomers.map((customer) => (
            <motion.div
              key={customer.id}
              whileHover={{ y: -4 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group"
            >
              <div className="h-32 bg-zinc-800 relative">
                <img 
                  src={customer.logo || `https://picsum.photos/seed/${customer.id}/200`} 
                  alt={customer.name} 
                  className="absolute -bottom-6 left-6 w-16 h-16 rounded-2xl border-4 border-zinc-900 object-cover shadow-lg"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => setConfirmAction({ type: 'clone', id: customer.id })}
                    className="p-2 bg-zinc-900/90 backdrop-blur rounded-lg text-zinc-400 hover:text-emerald-500 border border-zinc-700 shadow-xl transition-all"
                    title="Clone Customer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => openEdit(customer)}
                    className="p-2 bg-zinc-900/90 backdrop-blur rounded-lg text-zinc-400 hover:text-white border border-zinc-700 shadow-xl transition-all"
                    title="Edit Customer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setConfirmAction({ type: 'delete', id: customer.id })}
                    className="p-2 bg-red-500/90 backdrop-blur rounded-lg text-white border border-red-600 shadow-xl transition-all"
                    title="Delete Customer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 pt-10">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">{customer.name}</h3>
                </div>
                <p className="text-zinc-500 text-sm mb-6 line-clamp-2">{customer.notes}</p>
                
                <Link 
                  to={`/customers/${customer.id}`}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 py-2 rounded-xl transition-all"
                >
                  View Details
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
          {filteredCustomers.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-600 italic">
              No customers found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2">
                {confirmAction.type === 'delete' ? 'Delete Customer' : 'Clone Customer'}
              </h2>
              <p className="text-zinc-400 mb-6">
                {confirmAction.type === 'delete' 
                  ? 'Are you sure you want to delete this customer? This action cannot be undone.' 
                  : 'Are you sure you want to clone this customer and all its products and components?'}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => confirmAction.type === 'delete' ? handleDelete(confirmAction.id) : handleClone(confirmAction.id)}
                  className={cn(
                    "px-4 py-2 font-bold rounded-xl transition-colors",
                    confirmAction.type === 'delete' 
                      ? "bg-red-500 hover:bg-red-600 text-white" 
                      : "bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
                  )}
                >
                  {confirmAction.type === 'delete' ? 'Delete' : 'Clone'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Company Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Company Logo</label>
                <div className="flex items-center gap-4">
                  {formData.logo ? (
                    <div className="relative group">
                      <img src={formData.logo} alt="Logo Preview" className="w-16 h-16 rounded-xl object-cover border border-zinc-800 shadow-lg" referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, logo: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full transition-opacity shadow-lg hover:bg-red-600 border-2 border-zinc-900"
                        title="Remove Logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-zinc-950 border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-600">
                      <Plus className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label 
                      htmlFor="logo-upload"
                      className="inline-block px-4 py-2 bg-zinc-800 text-white text-sm rounded-xl hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      Upload Logo
                    </label>
                    <p className="text-[10px] text-zinc-600 mt-1">Recommended: Square PNG/SVG</p>
                  </div>
                </div>
              </div>
              <div className="hidden">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Logo URL</label>
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white outline-none focus:ring-2 focus:ring-emerald-500 h-24"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  {editingCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
