import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomerListPage from './pages/CustomerListPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import UserManagementPage from './pages/UserManagementPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate, safeFetch } from './lib/utils';
import { Notification } from './types';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Settings,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Server,
  MapPin,
  Network,
  Image as ImageIcon,
  UserCog,
  AlertCircle,
  CheckCircle2,
  Info,
  ExternalLink,
  Database
} from 'lucide-react';

function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }: { 
  isOpen: boolean, 
  setIsOpen: (v: boolean) => void,
  isCollapsed: boolean,
  setIsCollapsed: (v: boolean) => void
}) {
  const { logout, user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/' },
    { icon: <Users className="w-5 h-5" />, label: 'Customer Management', path: '/customers' },
    { icon: <UserCircle className="w-5 h-5" />, label: 'My Profile', path: '/profile' },
  ];

  const systemSettingsItems = [
    { icon: <Server className="w-4 h-4" />, label: 'Component Types', path: '/settings/types' },
    { icon: <MapPin className="w-4 h-4" />, label: 'Sites', path: '/settings/sites' },
    { icon: <Network className="w-4 h-4" />, label: 'Protocols', path: '/settings/protocols' },
    { icon: <ImageIcon className="w-4 h-4" />, label: 'Icon Management', path: '/settings/icons' },
    { icon: <Bell className="w-4 h-4" />, label: 'Alert Settings', path: '/settings/alerts' },
    { icon: <Database className="w-4 h-4" />, label: 'Backup & Restore', path: '/settings/backup' },
    { icon: <UserCog className="w-4 h-4" />, label: 'User Management', path: '/users' },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
      >
        {isOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 bg-zinc-950 border-r border-zinc-900 transform transition-all duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className={cn(
            "flex items-center gap-3 p-6 mb-4",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                <Shield className="w-6 h-6 text-zinc-950" />
              </div>
              {!isCollapsed && (
                <span className="text-xl font-bold text-white tracking-tight">Identity & Application Security</span>
              )}
            </div>
          </div>

          {/* Collapse Toggle (Desktop) */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-12 w-6 h-6 bg-zinc-900 border border-zinc-800 rounded-full items-center justify-center text-zinc-400 hover:text-white transition-all z-50"
          >
            {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                  isCollapsed ? "justify-center" : "justify-start",
                  location.pathname === item.path ? "bg-emerald-500/10 text-emerald-500" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                )}
                title={isCollapsed ? item.label : ''}
              >
                <span className={cn(
                  "transition-colors shrink-0",
                  location.pathname === item.path ? "text-emerald-500" : "group-hover:text-emerald-500"
                )}>{item.icon}</span>
                {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            ))}

            {/* System Settings Tree */}
            {user?.role === 'admin' && (
              <div className="space-y-1">
                <button
                  onClick={() => !isCollapsed && setIsSettingsOpen(!isSettingsOpen)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                    isCollapsed ? "justify-center" : "justify-start",
                    (isSettingsOpen || location.pathname.startsWith('/settings') || location.pathname === '/users') ? "text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  )}
                >
                  <span className="group-hover:text-emerald-500 transition-colors shrink-0">
                    <Settings className="w-5 h-5" />
                  </span>
                  {!isCollapsed && (
                    <>
                      <span className="font-medium flex-1 text-left">System Settings</span>
                      {isSettingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </>
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      System Settings
                    </div>
                  )}
                </button>

                {(!isCollapsed && (isSettingsOpen || location.pathname.startsWith('/settings') || location.pathname === '/users')) && (
                  <div className="ml-4 pl-4 border-l border-zinc-800 space-y-1 mt-1">
                    {systemSettingsItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                          location.pathname === item.path ? "text-emerald-500 bg-emerald-500/5" : "text-zinc-500 hover:text-white hover:bg-zinc-900"
                        )}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="p-3 border-t border-zinc-900 space-y-4">
            <div className={cn(
              "flex items-center gap-3 px-3",
              isCollapsed ? "justify-center" : "justify-start"
            )}>
              <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 shrink-0 border border-zinc-700">
                {user?.username[0].toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium text-white truncate">{user?.username}</div>
                  <div className="text-xs text-zinc-500 capitalize">{user?.role}</div>
                </div>
              )}
            </div>
            <button 
              onClick={logout}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all group",
                isCollapsed ? "justify-center" : "justify-start"
              )}
              title={isCollapsed ? "Sign Out" : ''}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { pathname } = useLocation();
  const notificationRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (signal?: AbortSignal, retryCount = 0) => {
    try {
      const data = await safeFetch<Notification[]>('/api/notifications', { signal });
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      // Handle transient network errors with a retry
      if (retryCount < 3 && (error instanceof TypeError || (error.message && error.message.includes('NetworkError')))) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => fetchNotifications(signal, retryCount + 1), delay);
        return;
      }

      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchNotifications(controller.signal);
    const interval = setInterval(() => fetchNotifications(controller.signal), 30000); // Poll every 30s
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await safeFetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <main className={cn(
        "min-h-screen transition-all duration-300",
        isCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <header className="h-16 border-b border-zinc-900 flex items-center justify-end px-8 gap-4 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-30">
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn(
                "p-2 rounded-xl transition-all relative",
                isNotificationsOpen ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-white hover:bg-zinc-900"
              )}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-950">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="font-bold text-white">Notifications</h3>
                    <span className="text-xs text-zinc-500">{unreadCount} unread</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-800">
                        {notifications.map(notification => (
                          <div 
                            key={notification.id}
                            className={cn(
                              "p-4 transition-colors hover:bg-zinc-800/50 relative group",
                              !notification.isRead && "bg-emerald-500/5"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                notification.type === 'expiry' ? "bg-red-500/10 text-red-500" :
                                notification.type === 'security' ? "bg-amber-500/10 text-amber-500" :
                                "bg-blue-500/10 text-blue-500"
                              )}>
                                {notification.type === 'expiry' ? <AlertCircle className="w-4 h-4" /> :
                                 notification.type === 'security' ? <Shield className="w-4 h-4" /> :
                                 <Info className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <p className="text-sm font-bold text-white truncate">{notification.title}</p>
                                  <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                                    {formatDate(notification.timestamp)}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{notification.message}</p>
                                <div className="flex items-center justify-between">
                                  {!notification.isRead && (
                                    <button 
                                      onClick={() => markAsRead(notification.id)}
                                      className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-wider"
                                    >
                                      Mark as read
                                    </button>
                                  )}
                                  {notification.link && (
                                    <Link 
                                      to={notification.link}
                                      className="text-[10px] font-bold text-zinc-500 hover:text-white flex items-center gap-1 uppercase tracking-wider ml-auto"
                                    >
                                      View <ExternalLink className="w-2 h-2" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-3 bg-zinc-950/50 border-t border-zinc-800 text-center">
                      <button className="text-xs font-bold text-zinc-500 hover:text-white transition-colors">
                        View all notifications
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {user?.role === 'admin' && (
          <>
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/:tab" element={<SettingsPage />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
