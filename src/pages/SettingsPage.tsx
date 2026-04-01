import React, { useEffect, useState } from 'react';
import { SettingItem } from '../types';
import { Plus, Trash2, Settings, Server, MapPin, Network, Image as ImageIcon, Upload, Download, Database, Bell, Send, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn, safeFetch } from '../lib/utils';
import { AlertSettings } from '../types';

export default function SettingsPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [componentTypes, setComponentTypes] = useState<SettingItem[]>([]);
  const [sites, setSites] = useState<SettingItem[]>([]);
  const [protocols, setProtocols] = useState<SettingItem[]>([]);
  const [icons, setIcons] = useState<{ id: string, name: string, url: string }[]>([]);
  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null);
  const [alertHistory, setAlertHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingAlert, setTestingAlert] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'processing', message: string } | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [types, sites, protocols, icons, alerts, history] = await Promise.all([
        safeFetch<SettingItem[]>('/api/settings/componentTypes'),
        safeFetch<SettingItem[]>('/api/settings/sites'),
        safeFetch<SettingItem[]>('/api/settings/protocols'),
        safeFetch<{ id: string, name: string, url: string }[]>('/api/icons'),
        safeFetch<AlertSettings>('/api/settings/alerts'),
        safeFetch<any[]>('/api/settings/alerts/history')
      ]);
      
      setComponentTypes(types || []);
      setSites(sites || []);
      setProtocols(protocols || []);
      setIcons(icons || []);
      if (alerts) setAlertSettings(alerts);
      setAlertHistory(history || []);
    } catch (error) {
      console.error('Failed to fetch settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItem = async (type: string, name: string) => {
    if (!name) return;
    try {
      await safeFetch(`/api/settings/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      fetchData();
    } catch (error) {
      console.error(`Failed to add ${type}:`, error);
    }
  };

  const deleteItem = async (type: string, id: string) => {
    try {
      await safeFetch(`/api/settings/${type}/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const url = event.target?.result as string;
        try {
          await safeFetch('/api/icons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: file.name, url })
          });
        } catch (error) {
          console.error('Failed to upload icon:', error);
        }
        if (i === files.length - 1) {
          fetchData();
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset input
  };

  const deleteIcon = async (iconId: string) => {
    try {
      await safeFetch(`/api/icons/${iconId}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete icon:', error);
    }
  };

  const handleExport = async () => {
    try {
      const data = await safeFetch<any>('/api/backup/export');
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `secinfra-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Import initiated');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.size, file.type);
    setImportStatus({ type: 'processing', message: 'Reading and validating backup file...' });
    const reader = new FileReader();
    reader.onload = async (event) => {
      console.log('File read complete');
      try {
        const content = event.target?.result as string;
        if (!content || content.trim() === '') {
          console.error('File is empty');
          setImportStatus({ type: 'error', message: 'The selected file is empty.' });
          return;
        }

        let parsedData;
        try {
          parsedData = JSON.parse(content);
          console.log('JSON parsed successfully', {
            keys: Object.keys(parsedData),
            userCount: parsedData.users?.length,
            customerCount: parsedData.customers?.length
          });
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          setImportStatus({ type: 'error', message: 'Invalid JSON file format. Please ensure you are uploading a valid backup file.' });
          return;
        }
        
        console.log('Sending import request to server...');
        setImportStatus({ type: 'processing', message: 'Uploading and restoring database...' });
        
        try {
          const result = await safeFetch<{ success: boolean, message: string }>('/api/backup/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedData)
          });
          
          console.log('Import result:', result);
          if (result.success) {
            setImportStatus({ type: 'success', message: 'Database imported successfully! Reloading...' });
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            setImportStatus({ type: 'error', message: result.message || 'Import failed' });
          }
        } catch (error: any) {
          console.error('Import server error:', error);
          setImportStatus({ type: 'error', message: error.message || 'Server error occurred during import' });
        }
      } catch (error) {
        console.error('Import process error:', error);
        setImportStatus({ type: 'error', message: error instanceof Error ? error.message : 'An unexpected error occurred during import' });
      }
    };
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      setImportStatus({ type: 'error', message: 'Failed to read the file.' });
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleUpdateAlerts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertSettings) return;
    
    try {
      await safeFetch('/api/settings/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertSettings),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update alert settings:', error);
    }
  };

  const handleTestAlerts = async () => {
    if (!alertSettings?.globalTelegramToken || !alertSettings?.globalTelegramChatId) {
      return;
    }
    
    setTestingAlert(true);
    try {
      await safeFetch('/api/settings/alerts/test', { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error('Failed to test alerts:', error);
    } finally {
      setTestingAlert(false);
    }
  };

  const getUnitLabel = (days: number) => {
    if (days >= 1) return 'Days';
    if (days >= 1/24) return 'Hours';
    return 'Minutes';
  };

  const getValueInUnit = (days: number) => {
    if (days >= 1) return days;
    if (days >= 1/24) return Math.round(days * 24);
    return Math.round(days * 1440);
  };

  const convertToDays = (value: number, unit: string) => {
    if (unit === 'Days') return value;
    if (unit === 'Hours') return value / 24;
    if (unit === 'Minutes') return value / 1440;
    return value;
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading settings...</div>;

  const activeTab = tab || 'types';

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">System Settings</h1>
        <p className="text-zinc-500">Manage dropdown options and system assets</p>
      </div>

      <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit flex-wrap">
        <TabButton active={activeTab === 'types'} onClick={() => navigate('/settings/types')} icon={<Server className="w-4 h-4" />} label="Component Types" />
        <TabButton active={activeTab === 'sites'} onClick={() => navigate('/settings/sites')} icon={<MapPin className="w-4 h-4" />} label="Sites" />
        <TabButton active={activeTab === 'protocols'} onClick={() => navigate('/settings/protocols')} icon={<Network className="w-4 h-4" />} label="Protocols" />
        <TabButton active={activeTab === 'icons'} onClick={() => navigate('/settings/icons')} icon={<ImageIcon className="w-4 h-4" />} label="Icons" />
        <TabButton active={activeTab === 'alerts'} onClick={() => navigate('/settings/alerts')} icon={<Bell className="w-4 h-4" />} label="Alerts" />
        <TabButton active={activeTab === 'backup'} onClick={() => navigate('/settings/backup')} icon={<Database className="w-4 h-4" />} label="Backup & Restore" />
      </div>

      <div className="max-w-4xl">
        {activeTab === 'types' && (
          <SettingSection 
            title="Component Types" 
            icon={<Server className="w-5 h-5 text-emerald-500" />}
            items={componentTypes}
            onAdd={(name) => addItem('componentTypes', name)}
            onDelete={(id) => deleteItem('componentTypes', id)}
            placeholder="e.g. Windows, Linux, Vault"
          />
        )}
        
        {activeTab === 'sites' && (
          <SettingSection 
            title="Sites" 
            icon={<MapPin className="w-5 h-5 text-blue-500" />}
            items={sites}
            onAdd={(name) => addItem('sites', name)}
            onDelete={(id) => deleteItem('sites', id)}
            placeholder="e.g. DC, DR, CLOUD"
          />
        )}

        {activeTab === 'protocols' && (
          <SettingSection 
            title="Protocols" 
            icon={<Network className="w-5 h-5 text-purple-500" />}
            items={protocols}
            onAdd={(name) => addItem('protocols', name)}
            onDelete={(id) => deleteItem('protocols', id)}
            placeholder="e.g. TCP, UDP, HTTPS"
          />
        )}

        {activeTab === 'icons' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-8">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-white">Icon Management</h2>
            </div>

            <div className="space-y-4 p-6 bg-zinc-950 border border-zinc-800 rounded-xl">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Upload New Icons (PNG/SVG)</label>
                <div className="flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl p-8 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer relative group">
                  <input 
                    type="file" 
                    multiple
                    accept=".png,.svg" 
                    onChange={handleIconUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  <div className="flex flex-col items-center gap-2 text-zinc-500 group-hover:text-emerald-500">
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-medium">Click or drag to upload multiple icons</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {icons.map(icon => (
                <div key={icon.id} className="group relative bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-3 hover:border-emerald-500/50 transition-all">
                  <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 rounded-lg p-2">
                    <img src={icon.url} alt={icon.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <span className="text-[10px] text-zinc-500 truncate w-full text-center">{icon.name}</span>
                  <button 
                    onClick={() => deleteIcon(icon.id)}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full transition-all shadow-lg hover:bg-red-600 border-2 border-zinc-900"
                    title="Delete Icon"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && alertSettings && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-emerald-500" />
                <h2 className="text-xl font-bold text-white">License Expiration Alerts</h2>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleTestAlerts}
                  disabled={testingAlert}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${testingAlert ? 'animate-pulse' : ''}`} />
                  {testingAlert ? 'Testing...' : 'Test Connection'}
                </button>
                <button 
                  onClick={handleUpdateAlerts}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Reminder Thresholds</label>
                  <button 
                    onClick={() => setAlertSettings({
                      ...alertSettings,
                      reminderThresholds: [...alertSettings.reminderThresholds, 1]
                    })}
                    className="text-[10px] bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-2 py-1 rounded-md font-bold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Threshold
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {alertSettings.reminderThresholds.map((days, index) => (
                    <div key={index} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-3 rounded-xl group">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={getValueInUnit(days)}
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value) || 0;
                              const unit = getUnitLabel(days);
                              const newThresholds = [...alertSettings.reminderThresholds];
                              newThresholds[index] = convertToDays(newVal, unit);
                              setAlertSettings({ ...alertSettings, reminderThresholds: newThresholds });
                            }}
                            className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <select 
                            value={getUnitLabel(days)}
                            onChange={(e) => {
                              const unit = e.target.value;
                              const val = getValueInUnit(days);
                              const newThresholds = [...alertSettings.reminderThresholds];
                              newThresholds[index] = convertToDays(val, unit);
                              setAlertSettings({ ...alertSettings, reminderThresholds: newThresholds });
                            }}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="Minutes">Minutes</option>
                            <option value="Hours">Hours</option>
                            <option value="Days">Days</option>
                          </select>
                        </div>
                        <p className="text-[10px] text-zinc-500">Alert before expiration</p>
                      </div>
                      <button 
                        onClick={() => {
                          const newThresholds = alertSettings.reminderThresholds.filter((_, i) => i !== index);
                          setAlertSettings({ ...alertSettings, reminderThresholds: newThresholds });
                        }}
                        className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {alertSettings.reminderThresholds.length === 0 && (
                    <div className="col-span-full py-8 text-center border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                      No reminder thresholds configured.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Global Telegram Token</label>
                  <input 
                    type="password" 
                    value={alertSettings.globalTelegramToken}
                    onChange={(e) => setAlertSettings({ ...alertSettings, globalTelegramToken: e.target.value })}
                    placeholder="Enter Bot Token"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Global Telegram Chat ID</label>
                  <input 
                    type="text" 
                    value={alertSettings.globalTelegramChatId}
                    onChange={(e) => setAlertSettings({ ...alertSettings, globalTelegramChatId: e.target.value })}
                    placeholder="Enter Chat ID"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Telegram Message Template</label>
                <textarea 
                  value={alertSettings.telegramTemplate}
                  onChange={(e) => setAlertSettings({ ...alertSettings, telegramTemplate: e.target.value })}
                  rows={6}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="Available variables: {customerName}, {productName}, {expiryDate}, {daysLeft}"
                />
                <div className="flex flex-wrap gap-2">
                  {['{productName}', '{customerName}', '{expiryDate}', '{timeRemaining}'].map(tag => (
                    <span key={tag} className="px-2 py-1 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono">{tag}</span>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 italic">Use Markdown for formatting. Variables will be replaced automatically.</p>
              </div>

              <div className="pt-6 border-t border-zinc-800">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-500" />
                  Alert History
                </h3>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 text-zinc-500 font-medium">Timestamp</th>
                        <th className="px-4 py-3 text-zinc-500 font-medium">Customer</th>
                        <th className="px-4 py-3 text-zinc-500 font-medium">Product</th>
                        <th className="px-4 py-3 text-zinc-500 font-medium">Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {alertHistory.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-zinc-600 italic">No alerts sent yet</td>
                        </tr>
                      ) : (
                        alertHistory.map((alert, i) => (
                          <tr key={i} className="hover:bg-zinc-900/50 transition-colors">
                            <td className="px-4 py-3 text-zinc-400">{formatDate(alert.timestamp)}</td>
                            <td className="px-4 py-3 text-white font-medium">{alert.customerName}</td>
                            <td className="px-4 py-3 text-zinc-300">{alert.productName}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-bold uppercase text-[10px]">
                                {alert.threshold < 1 ? `${Math.round(alert.threshold * 1440)}m` : `${Math.round(alert.threshold)}d`}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-8">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-emerald-500" />
              <h2 className="text-xl font-bold text-white">Backup & Restore</h2>
            </div>
            
            <p className="text-zinc-400 text-sm">
              Export your entire database (customers, products, components, connections, and settings) to a JSON file, or import an existing backup to restore your data.
            </p>

            {importStatus && (
              <div className={cn(
                "p-4 rounded-xl border text-sm font-medium flex items-center gap-3",
                importStatus.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : 
                importStatus.type === 'processing' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                "bg-red-500/10 border-red-500/20 text-red-500"
              )}>
                {importStatus.type === 'processing' && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                {importStatus.message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center gap-4 hover:border-emerald-500/30 transition-colors">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                  <Download className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Export Data</h3>
                  <p className="text-xs text-zinc-500">Download a complete backup of your current database.</p>
                </div>
                <button 
                  onClick={handleExport}
                  className="mt-auto px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors w-full flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download JSON Backup
                </button>
              </div>

              {/* Import */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center gap-4 hover:border-blue-500/30 transition-colors relative group">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Import Data</h3>
                  <p className="text-xs text-zinc-500">Restore from a previous backup file. This will overwrite current data.</p>
                </div>
                
                <div className="mt-auto w-full relative">
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 bg-zinc-800 group-hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors w-full flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Select Backup File
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
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

function SettingSection({ title, icon, items, onAdd, onDelete, placeholder }: {
  title: string;
  icon: React.ReactNode;
  items: SettingItem[];
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
}) {
  const [newName, setNewName] = useState('');

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onAdd(newName);
              setNewName('');
            }
          }}
        />
        <button 
          onClick={() => { onAdd(newName); setNewName(''); }}
          className="p-2 bg-emerald-500 text-zinc-950 rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl group">
            <span className="text-zinc-300">{item.name}</span>
            <button 
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-zinc-600 text-sm italic">No items added yet</div>
        )}
      </div>
    </div>
  );
}
