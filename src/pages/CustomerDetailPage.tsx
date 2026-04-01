import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Customer, Product, Component, Connection } from '../types';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  Network, 
  MapPin, 
  Server, 
  ShieldCheck,
  ChevronRight,
  MoreVertical,
  Plus,
  X,
  Globe,
  Trash2,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  Edit,
  Settings,
  Copy,
  Check,
  Eye,
  FileText,
  FileDigit,
  Calendar,
  Upload,
  FileIcon,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getLicenseStatus, calculateSecurityScore, formatDate, safeFetch } from '../lib/utils';
import ReactFlow, { Background, Controls, Node, Edge, NodeProps, Handle, Position, EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import 'reactflow/dist/style.css';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { SettingItem } from '../types';

type Tab = 'summary' | 'products' | 'components' | 'diagram' | 'notifications';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer & { products: Product[], components: Component[] } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [components, setComponents] = useState<Component[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [icons, setIcons] = useState<{ id: string, name: string, url: string }[]>([]);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingPositions, setPendingPositions] = useState<{ [id: string]: { x: number, y: number } }>({});
  const [isSavingPositions, setIsSavingPositions] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [connectionParams, setConnectionParams] = useState<{ source: string, target: string, sourceHandle?: string | null, targetHandle?: string | null } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Settings states
  const [componentTypes, setComponentTypes] = useState<SettingItem[]>([]);
  const [sites, setSites] = useState<SettingItem[]>([]);
  const [protocols, setProtocols] = useState<SettingItem[]>([]);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState<Partial<Product>>({});
  const [isCopying, setIsCopying] = useState(false);
  const [isAttUploading, setIsAttUploading] = useState<string | null>(null);

  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [activeProductTab, setActiveProductTab] = useState<'info' | 'usage' | 'attachments'>('info');

  // Connection form state
  const [connectionUrls, setConnectionUrls] = useState<string[]>(['']);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchSettings = async (signal?: AbortSignal) => {
    try {
      const [types, sites, protocols] = await Promise.all([
        safeFetch<SettingItem[]>('/api/settings/componentTypes', { signal }),
        safeFetch<SettingItem[]>('/api/settings/sites', { signal }),
        safeFetch<SettingItem[]>('/api/settings/protocols', { signal })
      ]);
      setComponentTypes(types);
      setSites(sites);
      setProtocols(protocols);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchCustomer = async (signal?: AbortSignal) => {
    try {
      const data = await safeFetch<Customer & { products: Product[], components: Component[] }>(`/api/customers/${id}`, { signal });
      setCustomer(data);
      if (data.products.length > 0 && !selectedProductId) {
        setSelectedProductId(data.products[0].id);
        fetchComponents(data.products[0].id, signal);
      }
      setLoading(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch customer:', err);
      setLoading(false);
    }
    fetchNotifications(signal);
  };

  const fetchIcons = async (signal?: AbortSignal) => {
    try {
      const data = await safeFetch<{ id: string, name: string, url: string }[]>('/api/icons', { signal });
      setIcons(data);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch icons:', err);
    }
  };

  const fetchNotifications = async (signal?: AbortSignal) => {
    try {
      const data = await safeFetch<any[]>(`/api/customers/${id}/notifications`, { signal });
      setNotifications(data);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch customer notifications:', err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchCustomer(controller.signal);
    fetchSettings(controller.signal);
    fetchIcons(controller.signal);
    return () => controller.abort();
  }, [id]);

  const fetchComponents = async (productId: string, signal?: AbortSignal) => {
    setSelectedProductId(productId);
    try {
      const data = await safeFetch<{ components: Component[], connections: Connection[] }>(`/api/products/${productId}/components`, { signal });
      // Merge pending positions into fetched components to avoid jumpiness
      const mergedComponents = data.components.map((c: any) => ({
        ...c,
        position: pendingPositions[c.id] || c.position
      }));
      setComponents(mergedComponents);
      setConnections(data.connections);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch components:', err);
    }
  };

  useEffect(() => {
    if (editingProduct) {
      setProductFormData(editingProduct);
    } else {
      setProductFormData({
        licenseType: 'Per User',
        autoCalculateUsage: true,
        allowOverAllocation: false,
        autoReminder: true,
        totalLicenses: 0,
        licensesUsed: 0,
        version: '',
        licenseKey: '',
        description: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        startDate: new Date().toISOString().split('T')[0],
        renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      });
    }
  }, [editingProduct]);

  const handleProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Calculate licensesUsed if autoCalculateUsage is true
    let finalLicensesUsed = productFormData.licensesUsed || 0;
    if (productFormData.autoCalculateUsage && editingProduct) {
      finalLicensesUsed = customer?.components?.filter(c => c.productId === editingProduct.id).length || 0;
    }

    const payload = { 
      ...productFormData, 
      licensesUsed: finalLicensesUsed,
      customerId: id
    };
    
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    setIsProductModalOpen(false);
    setEditingProduct(null);
    fetchCustomer();
  };

  const handleComponentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const payload = { ...data, productId: selectedProductId };
    
    const url = editingComponent ? `/api/components/${editingComponent.id}` : '/api/components';
    const method = editingComponent ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    setIsComponentModalOpen(false);
    setEditingComponent(null);
    if (selectedProductId) fetchComponents(selectedProductId);
  };

  const handleConnectionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Save positions first if any
    if (Object.keys(pendingPositions).length > 0) {
      await fetch('/api/components/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: pendingPositions }),
      });
      setPendingPositions({});
    }

    const data = Object.fromEntries(formData.entries());
    const payload = {
      ...data,
      sourceHandle: connectionParams?.sourceHandle || editingConnection?.sourceHandle,
      targetHandle: connectionParams?.targetHandle || editingConnection?.targetHandle,
      urls: editingConnection ? editingConnection.urls : (editingConnection?.urls || connectionUrls.filter(u => u.trim() !== ''))
    };
    
    const url = editingConnection ? `/api/connections/${editingConnection.id}` : '/api/connections';
    const method = editingConnection ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    setIsConnectionModalOpen(false);
    setEditingConnection(null);
    setConnectionParams(null);
    setConnectionUrls(['']);
    if (selectedProductId) fetchComponents(selectedProductId);
  };

  const handleSavePositions = async () => {
    if (Object.keys(pendingPositions).length === 0) return;
    
    setIsSavingPositions(true);
    try {
      const response = await fetch('/api/components/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: pendingPositions }),
      });
      
      if (response.ok) {
        showToast('Positions saved successfully');
        setPendingPositions({});
      } else {
        showToast('Failed to save positions', 'error');
      }
    } catch (error) {
      showToast('Error saving positions', 'error');
    } finally {
      setIsSavingPositions(false);
    }
  };

  const handleIconUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    if (!file) return;

    // In a real app, we would upload the file to a storage service.
    // For this demo, we'll just use a data URL.
    const reader = new FileReader();
    reader.onload = async (event) => {
      const url = event.target?.result as string;
      await fetch('/api/icons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, url })
      });
      fetchIcons();
      e.currentTarget.reset();
    };
    reader.readAsDataURL(file);
  };

  const deleteIcon = async (iconId: string) => {
    await fetch(`/api/icons/${iconId}`, { method: 'DELETE' });
    fetchIcons();
  };

  const handleUpdatePosition = (componentId: string, position: { x: number, y: number }) => {
    if (isNaN(position.x) || isNaN(position.y)) return;
    setPendingPositions(prev => ({ ...prev, [componentId]: position }));
    // Update local state to avoid jumpiness
    setComponents(prev => prev.map(c => c.id === componentId ? { ...c, position } : c));
  };

  const deleteProduct = async (productId: string) => {
    await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    fetchCustomer();
  };

  const deleteComponent = async (componentId: string) => {
    await fetch(`/api/components/${componentId}`, { method: 'DELETE' });
    if (selectedProductId) fetchComponents(selectedProductId);
  };

  const deleteConnection = async (connId: string) => {
    // Save positions first if any
    if (Object.keys(pendingPositions).length > 0) {
      await fetch('/api/components/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: pendingPositions }),
      });
      setPendingPositions({});
    }
    const response = await fetch(`/api/connections/${connId}`, { method: 'DELETE' });
    if (response.ok) {
      showToast('Connection deleted successfully');
      if (selectedProductId) fetchComponents(selectedProductId);
    } else {
      showToast('Failed to delete connection', 'error');
    }
  };

  const getLatestVersion = (productId: string) => {
    if (!customer?.components) return 'N/A';
    const productComponents = customer.components.filter(c => c.productId === productId);
    if (productComponents.length === 0) return 'N/A';
    return productComponents.reduce((latest, curr) => {
      // Simple string comparison for versioning
      return curr.version > latest ? curr.version : latest;
    }, productComponents[0].version);
  };

  const [diagramViewMode, setDiagramViewMode] = useState<'auto' | 'uploaded'>('auto');
  const [isDiagramUploading, setIsDiagramUploading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleDiagramUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProductId) return;

    // Robust type detection: check MIME type OR file extension
    const fileName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isSvg = file.type === 'image/svg+xml' || fileName.endsWith('.svg');
    
    const diagramType = isPdf ? 'pdf' : isSvg ? 'svg' : null;
    
    if (!diagramType) {
      showToast('Please upload a PDF or SVG file.', 'error');
      return;
    }

    setIsDiagramUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const diagramUrl = reader.result as string;
        const response = await fetch(`/api/products/${selectedProductId}/diagram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diagramUrl, diagramType }),
        });

        if (response.ok) {
          showToast('Diagram uploaded successfully');
          fetchCustomer();
          setDiagramViewMode('uploaded');
        } else {
          showToast('Failed to upload diagram', 'error');
        }
        setIsDiagramUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading diagram:', error);
      showToast('Error uploading diagram', 'error');
      setIsDiagramUploading(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!customer?.telegramToken || !customer?.telegramChatId) {
      showToast('Please provide Telegram Token and Chat ID', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/customers/${id}/test-telegram`, {
        method: 'POST',
      });
      if (response.ok) {
        showToast('Test notification sent to Telegram');
        fetchNotifications();
      } else {
        showToast('Failed to send Telegram notification', 'error');
      }
    } catch (error) {
      showToast('Error testing Telegram integration', 'error');
    }
  };

  const handleUpdateTelegram = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const token = formData.get('telegramToken') as string;
    const updates: any = {
      telegramChatId: formData.get('telegramChatId'),
    };
    
    // Only update token if it's not the masked value
    if (token && token !== '****************') {
      updates.telegramToken = token;
    }

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        showToast('Telegram settings updated');
        fetchCustomer();
      } else {
        showToast('Failed to update settings', 'error');
      }
    } catch (error) {
      showToast('Error updating Telegram settings', 'error');
    }
  };

  if (loading || !customer) return <div className="p-8 text-zinc-500">Loading customer details...</div>;

  const selectedProduct = customer.products.find(p => p.id === selectedProductId);

  const siteStats = components.reduce((acc, c) => {
    acc[c.site] = (acc[c.site] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <img src={customer.logo || `https://picsum.photos/seed/${customer.id}/200`} alt={customer.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-zinc-800" referrerPolicy="no-referrer" />
          <div>
            <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
              <Link to="/customers" className="hover:text-white transition-colors">Customers</Link>
              <ChevronRight className="w-4 h-4" />
              <span>{customer.name}</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{customer.name}</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); setActiveProductTab('info'); }}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl flex items-center gap-2 transition-all"
          >
            <Package className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit">
        <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<LayoutDashboard className="w-4 h-4" />} label="Summary" />
        <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<Package className="w-4 h-4" />} label="Products" />
        <TabButton active={activeTab === 'components'} onClick={() => setActiveTab('components')} icon={<Layers className="w-4 h-4" />} label="Components" />
        <TabButton active={activeTab === 'diagram'} onClick={() => setActiveTab('diagram')} icon={<Network className="w-4 h-4" />} label="Diagram" />
        <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell className="w-4 h-4" />} label="Notifications" />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  Site Visibility
                </h3>
                <div className="space-y-4">
                  {Object.entries(siteStats).map(([site, count]) => (
                    <div key={site} className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <Server className="w-5 h-5 text-zinc-500" />
                        <span className="text-white font-medium">{site}</span>
                      </div>
                      <span className="text-emerald-500 font-bold">{count} Components</span>
                    </div>
                  ))}
                  {Object.keys(siteStats).length === 0 && (
                    <div className="text-zinc-500 text-sm italic">No components tracked yet</div>
                  )}
                </div>
              </div>
              
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                  Security Health
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                    <div className="text-zinc-500 text-xs mb-1">Overall Risk Score</div>
                    {(() => {
                      const score = calculateSecurityScore(customer.products, customer.components);
                      const scoreColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
                      return (
                        <>
                          <div className="text-2xl font-bold text-white">{score}/100</div>
                          <div className="w-full h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000", scoreColor)} style={{ width: `${score}%` }} />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {customer.products.map(product => {
                const status = getLicenseStatus(product);
                const latestVersion = getLatestVersion(product.id);
                return (
                  <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative group">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-white">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded uppercase tracking-wider">
                            {product.licenseType || 'Per User'}
                          </span>
                          <span className="text-zinc-500 text-xs">v{product.version || '1.0'}</span>
                        </div>
                      </div>
                      <div className={cn("px-3 py-1 rounded-full text-xs font-bold", status.color, "text-zinc-950")}>
                        {status.label}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <div className="text-zinc-500 text-xs mb-1">Purchase Date</div>
                        <div className="text-white font-medium text-sm">{formatDate(product.purchaseDate)}</div>
                      </div>
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <div className="text-zinc-500 text-xs mb-1 flex items-center justify-between">
                          <span>Expiry Date</span>
                          {product.autoReminder && (
                            <span title="Auto-reminder active">
                              <Bell className="w-3 h-3 text-emerald-500" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-white font-medium text-sm">{formatDate(product.expiryDate)}</div>
                          {(() => {
                            if (!product.expiryDate || product.expiryDate.toLowerCase() === 'unlimited') return null;
                            const days = Math.ceil((new Date(product.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            if (isNaN(days)) return null;
                            return (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                days < 0 ? "bg-red-500/20 text-red-500" : 
                                days <= 30 ? "bg-amber-500/20 text-amber-500" : 
                                "bg-emerald-500/20 text-emerald-500"
                              )}>
                                {days < 0 ? 'Expired' : `${days}d left`}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* License Usage Bar */}
                    <div className="mb-6 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-500 text-xs uppercase font-bold tracking-wider">License Usage</span>
                        <span className={cn(
                          "text-xs font-bold",
                          (product.licensesUsed || 0) > (product.totalLicenses || 0) ? "text-red-500" : "text-emerald-500"
                        )}>
                          {product.licensesUsed || 0} / {product.totalLicenses || 0}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-2">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            (product.licensesUsed || 0) > (product.totalLicenses || 0) ? "bg-red-500" : "bg-emerald-500"
                          )} 
                          style={{ width: `${Math.min(100, ((product.licensesUsed || 0) / (product.totalLicenses || 1)) * 100)}%` }} 
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Latest Infrastructure Version</span>
                        <span className="text-[10px] text-emerald-500 font-mono font-bold">{latestVersion}</span>
                      </div>
                      {(product.licensesUsed || 0) > (product.totalLicenses || 0) && !product.allowOverAllocation && (
                        <div className="mt-2 flex items-center gap-1.5 text-red-500">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase">Over-allocated!</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setActiveTab('components'); fetchComponents(product.id); }}
                        className="flex-1 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition-all text-sm font-bold uppercase tracking-wider"
                      >
                        Infrastructure
                      </button>
                      
                      <button 
                        onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); setActiveProductTab('info'); }}
                        className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button 
                        onClick={() => setConfirmDialog({
                          isOpen: true,
                          title: 'Delete Product',
                          message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
                          onConfirm: () => deleteProduct(product.id)
                        })}
                        className="p-2 bg-zinc-950 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/50 rounded-xl text-zinc-500 hover:text-red-500 transition-all"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {(product.licenseAgreementUrl || product.invoiceUrl || product.proofUrl) && (
                        <div className="flex gap-1">
                          {product.licenseAgreementUrl && (
                            <a href={product.licenseAgreementUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-emerald-500 transition-colors" title="License Agreement">
                              <FileText className="w-4 h-4" />
                            </a>
                          )}
                          {product.invoiceUrl && (
                            <a href={product.invoiceUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-emerald-500 transition-colors" title="Invoice">
                              <FileDigit className="w-4 h-4" />
                            </a>
                          )}
                          {product.proofUrl && (
                            <a href={product.proofUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-emerald-500 transition-colors" title="Screenshot / Proof">
                              <ImageIcon className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <select 
                  value={selectedProductId || ''} 
                  onChange={(e) => fetchComponents(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white outline-none"
                >
                  {customer.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button 
                  onClick={() => { setEditingComponent(null); setIsComponentModalOpen(true); }}
                  className="px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Component
                </button>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-zinc-950 border-bottom border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 text-zinc-400 font-medium text-sm">Component</th>
                      <th className="px-6 py-4 text-zinc-400 font-medium text-sm">Site</th>
                      <th className="px-6 py-4 text-zinc-400 font-medium text-sm">Owner</th>
                      <th className="px-6 py-4 text-zinc-400 font-medium text-sm">IP Address</th>
                      <th className="px-6 py-4 text-zinc-400 font-medium text-sm">Version</th>
                      <th className="px-6 py-4 text-zinc-400 font-medium text-sm text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {components.map(comp => (
                      <tr key={comp.id} className="hover:bg-zinc-950/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden border border-zinc-700">
                              {comp.icon ? (
                                <img src={comp.icon} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Server className="w-5 h-5 text-zinc-500" />
                              )}
                            </div>
                            <div>
                              <div className="text-white font-medium">{comp.name}</div>
                              <div className="text-zinc-500 text-xs">{comp.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700"
                          )}>
                            {comp.site}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-300 text-sm">{comp.owner}</td>
                        <td className="px-6 py-4 font-mono text-zinc-400 text-xs">{comp.ip}</td>
                        <td className="px-6 py-4 text-zinc-300 text-sm">{comp.version}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => { setEditingComponent(comp); setIsComponentModalOpen(true); }}
                              className="p-2 text-zinc-500 hover:text-white"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setConfirmDialog({
                                isOpen: true,
                                title: 'Delete Component',
                                message: `Are you sure you want to delete "${comp.name}"? This action cannot be undone.`,
                                onConfirm: () => deleteComponent(comp.id)
                              })}
                              className="p-2 text-red-500 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'diagram' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-zinc-500 text-sm">Visualizing {components.length} components and {connections.length} connections</div>
                  <button 
                    onClick={() => setIsIconModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-all"
                  >
                    <Layers className="w-3 h-3" />
                    Manage Icons
                  </button>
                  {selectedProduct?.diagramUrl && (
                    <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <button 
                        onClick={() => setDiagramViewMode('auto')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2",
                          diagramViewMode === 'auto' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        <Network className="w-3 h-3" />
                        Auto-generated
                      </button>
                      <button 
                        onClick={() => setDiagramViewMode('uploaded')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2",
                          diagramViewMode === 'uploaded' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        <Globe className="w-3 h-3" />
                        Uploaded File
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {diagramViewMode === 'uploaded' && selectedProduct?.diagramUrl && (
                    <button 
                      onClick={() => setIsFullScreen(true)}
                      className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition-all flex items-center gap-2"
                      title="Full Screen"
                    >
                      <Maximize className="w-4 h-4" />
                      <span className="text-xs font-bold hidden sm:inline">Full Screen</span>
                    </button>
                  )}
                  <label className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl flex items-center gap-2 transition-all cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-bold">{selectedProduct?.diagramUrl ? 'Update File' : 'Upload PDF/SVG'}</span>
                    <input type="file" accept=".pdf,.svg" className="hidden" onChange={handleDiagramUpload} disabled={isDiagramUploading} />
                  </label>
                  {selectedProduct?.diagramUrl && (
                    <a 
                      href={selectedProduct.diagramUrl}
                      download={`diagram-${selectedProduct.name}.${selectedProduct.diagramType}`}
                      className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition-all"
                      title="Download Diagram"
                      onClick={() => showToast('Starting download...')}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  {selectedProduct?.diagramUrl && (
                    <button 
                      onClick={async () => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Delete Diagram',
                          message: 'Delete this diagram?',
                          onConfirm: async () => {
                            const response = await fetch(`/api/products/${selectedProductId}/diagram`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ diagramUrl: '', diagramType: 'svg' }),
                            });
                            if (response.ok) {
                              showToast('Diagram deleted');
                              fetchCustomer();
                              setDiagramViewMode('auto');
                            }
                          }
                        });
                      }}
                      className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsConnectionModalOpen(true)}
                    className="px-4 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-bold">Add Connection</span>
                  </button>
                </div>
              </div>
              <div className="h-[600px] bg-zinc-950 border border-zinc-800 rounded-2xl relative overflow-hidden group">
                {diagramViewMode === 'uploaded' && selectedProduct?.diagramUrl ? (
                  <div className="w-full h-full flex flex-col relative">
                    {selectedProduct.diagramType === 'pdf' ? (
                      <iframe 
                        src={selectedProduct.diagramUrl} 
                        className="w-full h-full border-none"
                        title="Diagram PDF"
                      />
                    ) : (
                      <div className="w-full h-full bg-white">
                        <TransformWrapper
                          initialScale={1}
                          minScale={0.1}
                          maxScale={8}
                          centerOnInit
                          limitToBounds={false}
                          panning={{ disabled: false }}
                        >
                          {({ zoomIn, zoomOut, resetTransform }) => (
                            <>
                              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => zoomIn()} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-white shadow-lg backdrop-blur-sm">
                                  <ZoomIn className="w-4 h-4" />
                                </button>
                                <button onClick={() => zoomOut()} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-white shadow-lg backdrop-blur-sm">
                                  <ZoomOut className="w-4 h-4" />
                                </button>
                                <button onClick={() => resetTransform()} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-white shadow-lg backdrop-blur-sm">
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </div>
                              <TransformComponent
                                wrapperStyle={{ width: "100%", height: "100%" }}
                              >
                                <img 
                                  src={selectedProduct.diagramUrl} 
                                  alt="Diagram SVG" 
                                  className="max-w-none shadow-2xl cursor-move"
                                  referrerPolicy="no-referrer"
                                />
                              </TransformComponent>
                            </>
                          )}
                        </TransformWrapper>
                      </div>
                    )}
                  </div>
                ) : (
                  <DiagramView 
                    components={components} 
                    connections={connections} 
                    customerLogo={customer?.logo || ''} 
                    onDeleteConnection={(id) => setConfirmDialog({
                      isOpen: true,
                      title: 'Delete Connection',
                      message: 'Are you sure you want to delete this connection?',
                      onConfirm: () => deleteConnection(id)
                    })}
                    onUpdatePosition={handleUpdatePosition}
                    onConnect={(params) => {
                      setEditingConnection(null);
                      setConnectionParams({ 
                        source: params.source, 
                        target: params.target,
                        sourceHandle: params.sourceHandle,
                        targetHandle: params.targetHandle
                      });
                      setIsConnectionModalOpen(true);
                    }}
                    onEditConnection={(conn) => {
                      setEditingConnection(conn);
                      setConnectionParams(null);
                      setIsConnectionModalOpen(true);
                    }}
                    onRefresh={() => selectedProductId && fetchComponents(selectedProductId)}
                    pendingPositions={pendingPositions}
                    setPendingPositions={setPendingPositions}
                    hasPendingPositions={Object.keys(pendingPositions).length > 0}
                    onSavePositions={handleSavePositions}
                    isSaving={isSavingPositions}
                  />
                )}
              </div>
            </div>
          )}
          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                      <Bell className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Telegram Integration</h3>
                      <p className="text-sm text-zinc-500">Get license expiration alerts directly in your Telegram chat.</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateTelegram} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bot Token</label>
                        <input 
                          name="telegramToken"
                          type="password"
                          defaultValue={customer?.telegramToken}
                          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Chat ID</label>
                        <input 
                          name="telegramChatId"
                          type="text"
                          defaultValue={customer?.telegramChatId}
                          placeholder="-100123456789"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        type="submit"
                        className="px-6 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-all"
                      >
                        Save Settings
                      </button>
                      <button 
                        type="button"
                        onClick={handleTestTelegram}
                        className="px-6 py-2.5 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Test Connection
                      </button>
                    </div>
                  </form>

                  <div className="mt-8 p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <h4 className="text-sm font-bold text-white mb-2">How to set up:</h4>
                    <ol className="text-xs text-zinc-500 space-y-2 list-decimal ml-4">
                      <li>Message <a href="https://t.me/botfather" target="_blank" className="text-emerald-500 hover:underline">@BotFather</a> on Telegram to create a new bot and get your <b>Token</b>.</li>
                      <li>Add your bot to a group or message it directly.</li>
                      <li>Use <a href="https://t.me/userinfobot" target="_blank" className="text-emerald-500 hover:underline">@userinfobot</a> to find your <b>Chat ID</b>.</li>
                      <li>Enter the details above and save. Alerts will be sent 2 weeks and 3 days before any license expires.</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[600px]">
                  <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Recent Notifications</h3>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-xs text-zinc-600">No recent notifications</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                          <div className="flex justify-between items-start">
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                              n.status === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                            )}>
                              {n.status}
                            </span>
                            <span className="text-[10px] text-zinc-600">
                              {formatDate(n.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[100]"
          >
            <div className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl",
              toast.type === 'success' 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                : "bg-red-500/10 border-red-500/20 text-red-500"
            )}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-bold">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {isFullScreen && selectedProduct?.diagramUrl && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
            <div className="flex items-center gap-4">
              <h3 className="text-white font-bold">{selectedProduct.name} - Diagram</h3>
              <div className="flex items-center gap-2">
                {selectedProduct.diagramType === 'svg' && (
                  <div className="flex items-center gap-2 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                    <button 
                      onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.2))}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-zinc-500 min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button 
                      onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.2))}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-zinc-800 mx-1" />
                    <button 
                      onClick={() => setZoomLevel(1)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <a 
                  href={selectedProduct.diagramUrl}
                  download={`diagram-${selectedProduct.name}.${selectedProduct.diagramType}`}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all flex items-center gap-2"
                  title="Download Diagram"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs font-medium">Download</span>
                </a>
              </div>
            </div>
            <button 
              onClick={() => { setIsFullScreen(false); setZoomLevel(1); }}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-xl transition-all"
            >
              <Minimize className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-white flex items-center justify-center relative group">
            {selectedProduct.diagramType === 'pdf' ? (
              <iframe 
                src={selectedProduct.diagramUrl} 
                className="w-full h-full border-none rounded-lg shadow-2xl"
                title="Full Screen PDF"
              />
            ) : (
              <div className="w-full h-full cursor-move">
                <TransformWrapper
                  initialScale={zoomLevel}
                  minScale={0.1}
                  maxScale={10}
                  centerOnInit
                  panning={{ disabled: false }}
                >
                  {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => zoomIn()} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-white shadow-lg backdrop-blur-sm">
                          <ZoomIn className="w-5 h-5" />
                        </button>
                        <button onClick={() => zoomOut()} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-white shadow-lg backdrop-blur-sm">
                          <ZoomOut className="w-5 h-5" />
                        </button>
                        <button onClick={() => resetTransform()} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-white shadow-lg backdrop-blur-sm">
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      </div>
                      <TransformComponent
                        wrapperStyle={{ width: "100%", height: "100%" }}
                        contentStyle={{ width: "100%", height: "100%" }}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <img 
                            src={selectedProduct.diagramUrl} 
                            alt="Full Screen SVG" 
                            className="max-w-none shadow-2xl"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </TransformComponent>
                    </>
                  )}
                </TransformWrapper>
              </div>
            )}
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <Modal 
          title={editingProduct ? 'Edit Product License' : 'Add Product License'} 
          onClose={() => { setIsProductModalOpen(false); setActiveProductTab('info'); }}
          className="max-w-2xl"
        >
          <div className="flex gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl mb-6">
            {[
              { id: 'info', label: 'General Info', icon: FileText },
              { id: 'usage', label: 'Usage & Dates', icon: FileDigit },
              { id: 'attachments', label: 'Attachments', icon: Upload }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveProductTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                  activeProductTab === tab.id 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleProductSubmit} className="space-y-6">
            {activeProductTab === 'info' && (
              <div className="space-y-4 motion-preset-fade">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Product Name</label>
                    <input 
                      type="text" 
                      value={productFormData.name || ''} 
                      onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                      placeholder="Product Name" 
                      required 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">License Type</label>
                    <select 
                      value={productFormData.licenseType || 'Per User'} 
                      onChange={(e: any) => setProductFormData({ ...productFormData, licenseType: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Per User">Per User</option>
                      <option value="Per Device">Per Device</option>
                      <option value="Subscription">Subscription</option>
                      <option value="Perpetual">Perpetual</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Version</label>
                    <input 
                      type="text" 
                      value={productFormData.version || ''} 
                      onChange={(e) => setProductFormData({ ...productFormData, version: e.target.value })}
                      placeholder="e.g. 12.6" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">License ID / Serial</label>
                    <input 
                      type="text" 
                      value={productFormData.licenseId || ''} 
                      onChange={(e) => setProductFormData({ ...productFormData, licenseId: e.target.value })}
                      placeholder="License ID" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-zinc-500 uppercase">License Key / Serial Number</label>
                    <button 
                      type="button"
                      onClick={() => {
                        if (productFormData.licenseKey) {
                          navigator.clipboard.writeText(productFormData.licenseKey);
                          setIsCopying(true);
                          setTimeout(() => setIsCopying(false), 2000);
                        }
                      }}
                      className="text-[10px] flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      {isCopying ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {isCopying ? 'Copied!' : 'Copy Key'}
                    </button>
                  </div>
                  <textarea 
                    value={productFormData.licenseKey || ''} 
                    onChange={(e) => setProductFormData({ ...productFormData, licenseKey: e.target.value })}
                    placeholder="Paste license key here..." 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500 h-24 resize-none font-mono text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Description / Notes</label>
                  <textarea 
                    value={productFormData.description || ''} 
                    onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                    placeholder="Additional details..." 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500 h-20 resize-none" 
                  />
                </div>
              </div>
            )}

            {activeProductTab === 'usage' && (
              <div className="space-y-6 motion-preset-fade">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Total Purchased</label>
                      <input 
                        type="number" 
                        value={productFormData.totalLicenses || 0} 
                        onChange={(e) => setProductFormData({ ...productFormData, totalLicenses: parseInt(e.target.value) || 0 })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Licenses Used</label>
                      <input 
                        type="number" 
                        value={productFormData.autoCalculateUsage ? (customer?.components?.filter(c => c.productId === editingProduct?.id).length || 0) : (productFormData.licensesUsed || 0)} 
                        onChange={(e) => !productFormData.autoCalculateUsage && setProductFormData({ ...productFormData, licensesUsed: parseInt(e.target.value) || 0 })}
                        disabled={productFormData.autoCalculateUsage}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                      {productFormData.autoCalculateUsage && (
                        <p className="text-[10px] text-zinc-500 mt-1 italic">Calculated from infrastructure components</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Available</label>
                      <div className={cn(
                        "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 font-bold",
                        ((productFormData.totalLicenses || 0) - (productFormData.autoCalculateUsage ? (customer?.components?.filter(c => c.productId === editingProduct?.id).length || 0) : (productFormData.licensesUsed || 0))) < 0 ? "text-red-500" : "text-emerald-500"
                      )}>
                        {(productFormData.totalLicenses || 0) - (productFormData.autoCalculateUsage ? (customer?.components?.filter(c => c.productId === editingProduct?.id).length || 0) : (productFormData.licensesUsed || 0))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={productFormData.autoCalculateUsage || false} 
                        onChange={(e) => setProductFormData({ ...productFormData, autoCalculateUsage: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500" 
                      />
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Auto-calculate usage</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={productFormData.allowOverAllocation || false} 
                        onChange={(e) => setProductFormData({ ...productFormData, allowOverAllocation: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500" 
                      />
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Allow over-allocation</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-zinc-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Purchase Date</label>
                      <input 
                        type="date" 
                        value={productFormData.purchaseDate || ''} 
                        onChange={(e) => setProductFormData({ ...productFormData, purchaseDate: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Start Date</label>
                      <input 
                        type="date" 
                        value={productFormData.startDate || ''} 
                        onChange={(e) => setProductFormData({ ...productFormData, startDate: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Renewal Date</label>
                      <input 
                        type="date" 
                        value={productFormData.renewalDate || ''} 
                        onChange={(e) => setProductFormData({ ...productFormData, renewalDate: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Expiry Date</label>
                      <input 
                        type="date" 
                        value={productFormData.expiryDate || ''} 
                        onChange={(e) => setProductFormData({ ...productFormData, expiryDate: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" 
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={productFormData.autoReminder || false} 
                      onChange={(e) => setProductFormData({ ...productFormData, autoReminder: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500" 
                    />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Auto reminder before expiration (30 days)</span>
                  </label>
                </div>
              </div>
            )}

            {activeProductTab === 'attachments' && (
              <div className="space-y-4 motion-preset-fade">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'License Agreement', key: 'licenseAgreementUrl', icon: FileText },
                    { label: 'Invoice', key: 'invoiceUrl', icon: FileDigit },
                    { label: 'Screenshot / Proof', key: 'proofUrl', icon: ImageIcon }
                  ].map((att) => (
                    <div key={att.key} className="space-y-2">
                      <label className="block text-[10px] font-medium text-zinc-500 mb-1 uppercase">{att.label}</label>
                      <div className="relative group">
                        <input 
                          type="file" 
                          className="hidden" 
                          id={`file-${att.key}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsAttUploading(att.key);
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setProductFormData({ ...productFormData, [att.key]: event.target?.result as string });
                                setIsAttUploading(null);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label 
                          htmlFor={`file-${att.key}`}
                          className={cn(
                            "w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-500/50 transition-all",
                            productFormData[att.key as keyof Product] ? "border-emerald-500/50 bg-emerald-500/5" : ""
                          )}
                        >
                          {isAttUploading === att.key ? (
                            <RotateCcw className="w-5 h-5 text-emerald-500 animate-spin" />
                          ) : productFormData[att.key as keyof Product] ? (
                            <>
                              <att.icon className="w-6 h-6 text-emerald-500" />
                              <span className="text-[10px] text-emerald-500 font-bold">Uploaded</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                              <span className="text-[10px] text-zinc-600 group-hover:text-emerald-500 transition-colors">Upload</span>
                            </>
                          )}
                        </label>
                        
                        {productFormData[att.key as keyof Product] && (
                          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a 
                              href={productFormData[att.key as keyof Product] as string} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-400 transition-colors"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <button 
                              type="button"
                              onClick={() => setProductFormData({ ...productFormData, [att.key]: undefined })}
                              className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-400 transition-colors"
                              title="Remove"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {productFormData[att.key as keyof Product] && (
                        <p className="text-[10px] text-zinc-500 text-center truncate px-2">
                          {att.label} ready
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-emerald-500 uppercase">Pro Tip</p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      You can preview uploaded files by hovering over the "Uploaded" box and clicking the eye icon. 
                      PDFs and images will open in a new tab for full viewing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-zinc-800 flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsProductModalOpen(false)}
                className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                {editingProduct ? 'Update License' : 'Create License'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isComponentModalOpen && (
        <Modal title={editingComponent ? 'Edit Component' : 'Add Component'} onClose={() => setIsComponentModalOpen(false)}>
          <form onSubmit={handleComponentSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Component Icon</label>
              <div className="grid grid-cols-4 gap-2 mb-2 max-h-32 overflow-y-auto p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    const input = document.querySelector('input[name="icon"]') as HTMLInputElement;
                    if (input) input.value = '';
                  }}
                  className="aspect-square bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 hover:border-emerald-500 transition-all"
                >
                  <Server className="w-4 h-4 text-zinc-500" />
                </button>
                {icons.map(icon => (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => {
                      const input = document.querySelector('input[name="icon"]') as HTMLInputElement;
                      if (input) input.value = icon.url;
                    }}
                    className="aspect-square bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 hover:border-emerald-500 transition-all overflow-hidden"
                  >
                    <img src={icon.url} alt={icon.name} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
              <input type="text" name="icon" defaultValue={editingComponent?.icon} placeholder="Or enter URL: https://..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Component Name</label>
              <input type="text" name="name" defaultValue={editingComponent?.name} placeholder="e.g. Vault-01" required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Type</label>
                <select name="type" defaultValue={editingComponent?.type} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500">
                  {componentTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Site</label>
                <select name="site" defaultValue={editingComponent?.site} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500">
                  {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Owner</label>
                <input type="text" name="owner" defaultValue={editingComponent?.owner} placeholder="Owner Name" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Version</label>
                <input type="text" name="version" defaultValue={editingComponent?.version} placeholder="e.g. 12.6" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">IP Address</label>
              <input type="text" name="ip" defaultValue={editingComponent?.ip} placeholder="10.0.0.1" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <button type="submit" className="w-full py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors mt-4">Save Component</button>
          </form>
        </Modal>
      )}

      {isConnectionModalOpen && (
        <Modal title={editingConnection ? 'Edit Connection' : 'Add Connection'} onClose={() => {
          setIsConnectionModalOpen(false);
          setEditingConnection(null);
          setConnectionParams(null);
        }}>
          <form onSubmit={handleConnectionSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Source</label>
                <select 
                  name="fromId" 
                  required 
                  defaultValue={editingConnection?.fromId || connectionParams?.source || ''} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select...</option>
                  {components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Destination</label>
                <select 
                  name="toId" 
                  required 
                  defaultValue={editingConnection?.toId || connectionParams?.target || ''} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select...</option>
                  {components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Source Handle</label>
                <select name="sourceHandle" defaultValue={connectionParams?.sourceHandle || editingConnection?.sourceHandle || 'bottom-source'} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="top-source">Top</option>
                  <option value="bottom-source">Bottom</option>
                  <option value="left-source">Left</option>
                  <option value="right-source">Right</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Target Handle</label>
                <select name="targetHandle" defaultValue={connectionParams?.targetHandle || editingConnection?.targetHandle || 'top-target'} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="top-target">Top</option>
                  <option value="bottom-target">Bottom</option>
                  <option value="left-target">Left</option>
                  <option value="right-target">Right</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Protocol</label>
                <select name="protocol" defaultValue={editingConnection?.protocol} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500">
                  {protocols.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Port</label>
                <input type="text" name="port" defaultValue={editingConnection?.port} placeholder="e.g. 443" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">URLs</label>
              {(editingConnection?.urls || connectionUrls).map((url, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input 
                      type="text" 
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...(editingConnection?.urls || connectionUrls)];
                        newUrls[idx] = e.target.value;
                        if (editingConnection) {
                          setEditingConnection({ ...editingConnection, urls: newUrls });
                        } else {
                          setConnectionUrls(newUrls);
                        }
                      }}
                      placeholder="https://..." 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-white text-sm outline-none focus:ring-1 focus:ring-emerald-500" 
                    />
                  </div>
                  {(editingConnection?.urls || connectionUrls).length > 1 && (
                    <button 
                      type="button"
                      onClick={() => {
                        const newUrls = (editingConnection?.urls || connectionUrls).filter((_, i) => i !== idx);
                        if (editingConnection) {
                          setEditingConnection({ ...editingConnection, urls: newUrls });
                        } else {
                          setConnectionUrls(newUrls);
                        }
                      }}
                      className="p-2 text-zinc-600 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button"
                onClick={() => {
                  if (editingConnection) {
                    setEditingConnection({ ...editingConnection, urls: [...editingConnection.urls, ''] });
                  } else {
                    setConnectionUrls([...connectionUrls, '']);
                  }
                }}
                className="text-emerald-500 text-xs font-bold flex items-center gap-1 hover:text-emerald-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add another URL
              </button>
            </div>

            <div className="flex gap-3 mt-4">
              <button type="submit" className="flex-1 py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors">
                {editingConnection ? 'Update Connection' : 'Create Connection'}
              </button>
              {editingConnection && (
                <button 
                  type="button"
                  onClick={() => {
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Delete Connection',
                      message: 'Delete this connection?',
                      onConfirm: () => {
                        deleteConnection(editingConnection.id);
                        setIsConnectionModalOpen(false);
                      }
                    });
                  }}
                  className="px-4 py-3 bg-red-500/10 text-red-500 font-bold rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {isIconModalOpen && (
        <Modal title="Manage Icons" onClose={() => setIsIconModalOpen(false)}>
          <div className="space-y-6">
            <form onSubmit={handleIconUpload} className="space-y-2">
              <label className="block text-xs font-medium text-zinc-500 uppercase">Upload New Icon (PNG/SVG)</label>
              <div className="flex gap-2">
                <input type="file" name="file" accept=".png,.svg" required className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white outline-none" />
                <button type="submit" className="px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-all">Upload</button>
              </div>
            </form>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-500 uppercase">Existing Icons</label>
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                {icons.map(icon => (
                  <div key={icon.id} className="group relative bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                    <img src={icon.url} alt={icon.name} className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
                    <span className="text-xs text-zinc-400 truncate flex-1">{icon.name}</span>
                    <button 
                      onClick={() => deleteIcon(icon.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-2">{confirmDialog.title}</h2>
            <p className="text-zinc-400 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className="px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              "fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px]",
              toast.type === 'success' ? "bg-zinc-900 border-emerald-500/50 text-white" : "bg-zinc-900 border-red-500/50 text-white"
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ title, children, onClose, className }: { title: string, children: React.ReactNode, onClose: () => void, className?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn("bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full shadow-2xl", className || "max-w-md")}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
        active ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ComponentNode({ data }: NodeProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl min-w-[120px] flex flex-col items-center gap-2 group hover:border-emerald-500/50 transition-all">
      {/* Top Handles */}
      <Handle type="target" position={Position.Top} id="top-target" className="w-3 h-3 !bg-emerald-500 border-2 border-zinc-900" />
      <Handle type="source" position={Position.Top} id="top-source" className="w-3 h-3 !bg-blue-500 border-2 border-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="w-12 h-12 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800 group-hover:bg-emerald-500/10 transition-colors">
        {data.icon ? (
          <img src={data.icon} alt="" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
        ) : (
          <Server className="w-6 h-6 text-zinc-500 group-hover:text-emerald-500" />
        )}
      </div>
      <div className="text-center">
        <div className="text-xs font-bold text-white truncate max-w-[100px]">{data.label}</div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{data.type}</div>
      </div>
      
      {/* Bottom Handles */}
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-3 h-3 !bg-emerald-500 border-2 border-zinc-900" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-3 h-3 !bg-blue-500 border-2 border-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Left Handles */}
      <Handle type="target" position={Position.Left} id="left-target" className="w-3 h-3 !bg-emerald-500 border-2 border-zinc-900" />
      <Handle type="source" position={Position.Left} id="left-source" className="w-3 h-3 !bg-blue-500 border-2 border-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Right Handles */}
      <Handle type="target" position={Position.Right} id="right-target" className="w-3 h-3 !bg-emerald-500 border-2 border-zinc-900" />
      <Handle type="source" position={Position.Right} id="right-source" className="w-3 h-3 !bg-blue-500 border-2 border-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data
}: EdgeProps) {
  const [showActions, setShowActions] = useState(false);
  const offset = data?.offset || 0;
  
  // Apply offset to source and target points to prevent overlapping
  const isVertical = sourcePosition === Position.Top || sourcePosition === Position.Bottom;
  const sX = isVertical ? sourceX + offset : sourceX;
  const sY = isVertical ? sourceY : sourceY + offset;
  const tX = isVertical ? targetX + offset : targetX;
  const tY = isVertical ? targetY : targetY + offset;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sX,
    sourceY: sY,
    sourcePosition,
    targetX: tX,
    targetY: tY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {/* Invisible wider path for easier clicking/hovering */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction cursor-pointer"
        onDoubleClick={(event) => {
          event.stopPropagation();
          setShowActions(!showActions);
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onDoubleClick={(event) => {
            event.stopPropagation();
            setShowActions(!showActions);
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <div 
              className="bg-zinc-900/80 backdrop-blur border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 whitespace-nowrap cursor-pointer hover:text-white transition-colors"
              title="Double-click to toggle actions"
            >
              {label}
            </div>
            {showActions && (
              <div className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur border border-zinc-700 p-1 rounded-lg shadow-xl">
                <button
                  className="w-6 h-6 bg-blue-500 text-white rounded-md flex items-center justify-center hover:bg-blue-600 transition-colors"
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onEdit(id);
                    setShowActions(false);
                  }}
                  title="Edit Connection"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button
                  className="w-6 h-6 bg-red-500 text-white rounded-md flex items-center justify-center hover:bg-red-600 transition-colors"
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onDelete(id);
                    setShowActions(false);
                  }}
                  title="Delete Connection"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = {
  component: ComponentNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

function DiagramView({ components, connections, customerLogo, onDeleteConnection, onUpdatePosition, onConnect, onEditConnection, onRefresh, pendingPositions, setPendingPositions, hasPendingPositions, onSavePositions, isSaving }: { 
  components: Component[], 
  connections: Connection[], 
  customerLogo: string,
  onDeleteConnection: (id: string) => void,
  onUpdatePosition: (id: string, position: { x: number, y: number }) => void,
  onConnect: (connection: any) => void,
  onEditConnection: (connection: Connection) => void,
  onRefresh: () => void,
  pendingPositions: { [id: string]: { x: number, y: number } },
  setPendingPositions: React.Dispatch<React.SetStateAction<{ [id: string]: { x: number, y: number } }>>,
  hasPendingPositions: boolean,
  onSavePositions: () => void,
  isSaving: boolean
}) {
  const nodes: Node[] = components.map((c, i) => ({
    id: c.id,
    type: 'component',
    data: { 
      label: c.name, 
      icon: c.icon,
      type: c.type
    },
    position: (c.position && Number.isFinite(c.position.x) && Number.isFinite(c.position.y)) 
      ? c.position 
      : { x: 100 + (i % 3) * 200, y: 100 + Math.floor(i / 3) * 150 },
  }));

  const edges: Edge[] = connections.map((c, index) => {
    // Find other connections between the same components to calculate offset
    const sameNodes = connections.filter(conn => 
      (conn.fromId === c.fromId && conn.toId === c.toId) || 
      (conn.fromId === c.toId && conn.toId === c.fromId)
    );
    const edgeIndex = sameNodes.findIndex(conn => conn.id === c.id);
    const offset = (edgeIndex - (sameNodes.length - 1) / 2) * 20;

    return {
      id: c.id,
      source: c.fromId,
      target: c.toId,
      sourceHandle: c.sourceHandle,
      targetHandle: c.targetHandle,
      type: 'custom',
      data: { 
        onDelete: onDeleteConnection, 
        onEdit: (id: string) => {
          const conn = connections.find(conn => conn.id === id);
          if (conn) onEditConnection(conn);
        },
        offset 
      },
      label: `${c.protocol}:${c.port}`,
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
    };
  });

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    onUpdatePosition(node.id, node.position);
  }, [onUpdatePosition]);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: any) => {
    const conn = connections.find(c => c.id === oldEdge.id);
    if (conn) {
      const updatedConn = {
        ...conn,
        fromId: newConnection.source,
        toId: newConnection.target,
        sourceHandle: newConnection.sourceHandle,
        targetHandle: newConnection.targetHandle
      };
      
      // Save positions if any
      const savePromise = Object.keys(pendingPositions).length > 0
        ? fetch('/api/components/positions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ positions: pendingPositions }),
          }).then(() => setPendingPositions({}))
        : Promise.resolve();

      savePromise.then(() => {
        fetch(`/api/connections/${conn.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedConn)
        }).then(res => {
          if (res.ok) onRefresh();
        });
      });
    }
  }, [connections, onRefresh, pendingPositions]);

  return (
    <div className="h-full w-full relative">
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        fitView 
      >
        <Background color="#27272a" gap={20} />
        <Controls />
      </ReactFlow>
      
      <div className="absolute top-4 right-4 flex flex-col gap-4 items-end">
        <div className="p-2 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl">
          <img src={customerLogo || `https://picsum.photos/seed/branding/200`} alt="Branding" className="w-12 h-12 rounded-lg object-cover opacity-50" referrerPolicy="no-referrer" />
        </div>
        
        {hasPendingPositions && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onSavePositions}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-zinc-950 rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Positions'}
          </motion.button>
        )}
      </div>
    </div>
  );
}
