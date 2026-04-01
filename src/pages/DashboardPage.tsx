import React, { useEffect, useState } from 'react';
import { DashboardStats, Customer, Product } from '../types';
import { Users, Package, AlertTriangle, Clock, X, ExternalLink, AlertCircle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, calculateSecurityScore, formatDate, safeFetch } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{ title: string, items: any[], type: 'customers' | 'products' } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    safeFetch<DashboardStats>('/api/dashboard', { signal: controller.signal })
      .then(setStats)
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch dashboard stats:', err);
        setError(err.message || 'Failed to load dashboard data. Please try again later.');
      });
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <AlertCircle className="text-red-500 w-6 h-6" />
        </div>
        <div className="text-center">
          <h2 className="text-white font-bold text-lg">Error Loading Dashboard</h2>
          <p className="text-zinc-500 text-sm max-w-md mt-1">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return <div className="p-8 text-zinc-500 flex items-center gap-3">
    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    Loading dashboard...
  </div>;

  const pieData = [
    { name: 'Expired', value: Number(stats.expiryStats.expired) || 0, color: '#ef4444' },
    { name: 'Critical', value: Number(stats.expiryStats.critical) || 0, color: '#f97316' },
    { name: 'Warning', value: Number(stats.expiryStats.warning) || 0, color: '#eab308' },
    { name: 'Notice', value: Number(stats.expiryStats.notice) || 0, color: '#84cc16' },
    { name: 'Healthy', value: Number(stats.expiryStats.healthy) || 0, color: '#10b981' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Global Dashboard</h1>
        <div className="text-zinc-500 text-sm">Last updated: {new Date().toLocaleTimeString()}</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Users className="text-blue-500" />} 
          label="Total Customers" 
          value={stats.totalCustomers || 0} 
          onClick={() => setModalData({ title: 'All Customers', items: stats.customers, type: 'customers' })}
        />
        <StatCard 
          icon={<Package className="text-purple-500" />} 
          label="Total Products" 
          value={stats.totalProducts || 0} 
          onClick={() => setModalData({ title: 'All Products', items: stats.products, type: 'products' })}
        />
        <StatCard 
          icon={<AlertTriangle className="text-red-500" />} 
          label="Expired Licenses" 
          value={stats.expiryStats.expired || 0} 
          onClick={() => setModalData({ title: 'Expired Licenses', items: stats.expiredProducts, type: 'products' })}
        />
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800 group-hover:border-emerald-500/50 transition-colors">
              <AlertCircle className="text-emerald-500" />
            </div>
            <div className="text-zinc-500 text-sm font-medium">Global Security Health</div>
          </div>
          {(() => {
            const score = calculateSecurityScore(stats.products, stats.components);
            const scoreColor = score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
            const bgColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div className="flex items-end justify-between">
                <div>
                  <div className={cn("text-3xl font-bold", scoreColor)}>{score}%</div>
                  <div className="text-[10px] text-zinc-600 uppercase font-bold mt-1 tracking-wider">Average Score</div>
                </div>
                <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div className={cn("h-full", bgColor)} style={{ width: `${score}%` }} />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <AnimatePresence>
        {modalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <h2 className="text-xl font-bold text-white">{modalData.title}</h2>
                <button 
                  onClick={() => setModalData(null)}
                  className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-3">
                {modalData.items.length > 0 ? (
                  modalData.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all group">
                      <div className="flex items-center gap-4">
                        {modalData.type === 'customers' ? (
                          <>
                            <img src={item.logo} alt="" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                            <div>
                              <div className="text-white font-medium">{item.name}</div>
                              <div className="text-zinc-500 text-xs">{item.notes}</div>
                            </div>
                          </>
                        ) : (
                          <div>
                            {item.customerName && <div className="text-zinc-400 text-xs font-medium mb-0.5">{item.customerName}</div>}
                            <div className="text-white font-medium">{item.name}</div>
                            <div className="text-zinc-500 text-xs">License: {item.licenseId}</div>
                            <div className="text-zinc-600 text-[10px] mt-1">Expires: {formatDate(item.expiryDate)}</div>
                          </div>
                        )}
                      </div>
                      <Link 
                        to={modalData.type === 'customers' ? `/customers/${item.id}` : `/customers/${item.customerId}`}
                        className="p-2 text-zinc-500 hover:text-emerald-500 bg-zinc-900 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-500 italic">No items found</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Site Visibility */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-emerald-500" />
            Site Visibility
          </h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.siteStats} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#52525b" fontSize={12} width={60} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* License Distribution */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">License Status</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-500" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            {stats.recentNotifications?.length > 0 ? (
              stats.recentNotifications.map((n: any) => (
                <div key={n.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-[4px] font-bold uppercase text-[9px]",
                      n.status === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {n.status}
                    </span>
                    <span className="text-zinc-600">{formatDate(n.timestamp)}</span>
                  </div>
                  <div className="text-zinc-400 line-clamp-2">{n.message}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-500 italic text-sm">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Risk Customers */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Top Risk Customers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.topRiskCustomers.map((customer) => {
              const customerProducts = stats.products.filter((p: any) => p.customerId === customer.id);
              const customerComponents = stats.components.filter((c: any) => customerProducts.some((p: any) => p.id === c.productId));
              const score = calculateSecurityScore(customerProducts, customerComponents);
              
              return (
                <Link key={customer.id} to={`/customers/${customer.id}`} className="flex items-center gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all group">
                  <img src={customer.logo} alt={customer.name} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <div className="text-white font-medium group-hover:text-emerald-500 transition-colors">{customer.name}</div>
                    <div className="text-zinc-500 text-xs">Security Score: {score}%</div>
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    score < 50 ? "bg-red-500" : score < 80 ? "bg-amber-500" : "bg-emerald-500"
                  )} />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Expiring Soon Products */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Expiring Soon</h2>
          <div className="space-y-3">
            {stats.expiringSoonProducts.slice(0, 4).map((product: any) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div>
                  <div className="text-zinc-400 text-xs font-medium mb-0.5">{product.customerName}</div>
                  <div className="text-white text-sm font-bold">{product.name}</div>
                  <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">{product.licenseId}</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-500 text-xs font-bold">{formatDate(product.expiryDate)}</div>
                  <div className="text-zinc-600 text-[9px] uppercase font-bold">Expires Soon</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, onClick }: { icon: React.ReactNode, label: string, value: number, onClick: () => void }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm cursor-pointer group"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800 group-hover:border-emerald-500/50 transition-colors">
          {icon}
        </div>
        <div className="text-zinc-500 text-sm font-medium">{label}</div>
      </div>
      <div className="text-3xl font-bold text-white flex items-center justify-between">
        {value}
        <ExternalLink className="w-4 h-4 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
      </div>
    </motion.div>
  );
}
