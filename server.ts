import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'db.json');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms - ${res.get('Content-Type')}`);
    });
    next();
  });

  app.use((req, res, next) => {
    res.on('finish', () => {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        saveDb();
      }
    });
    next();
  });

  // Mock Database
  const defaultDb = {
    users: [
      { 
        id: '1', 
        username: 'admin', 
        password: 'password', 
        role: 'admin', 
        mfaEnabled: false, 
        mfaSecret: '', 
        backupCodes: [] as string[],
        tempMfaSecret: '',
        isBlocked: false,
        failedLoginAttempts: 0
      }
    ],
    customers: [
      { id: '1', name: 'ABC Bank', logo: 'https://picsum.photos/seed/abc/200', notes: 'Major banking client', telegramToken: '', telegramChatId: '' },
      { id: '2', name: 'Global Telco', logo: 'https://picsum.photos/seed/telco/200', notes: 'Telecommunications sector', telegramToken: '', telegramChatId: '' }
    ],
    products: [
      { 
        id: '1', 
        customerId: '1', 
        name: 'CyberArk PAM', 
        licenseId: 'LIC-12345', 
        licenseType: 'Per User',
        version: '12.6',
        licenseKey: 'XXXX-XXXX-XXXX-XXXX',
        description: 'Core PAM solution',
        totalLicenses: 100,
        licensesUsed: 85,
        autoCalculateUsage: true,
        allowOverAllocation: false,
        purchaseDate: '2024-12-01',
        startDate: '2025-01-01', 
        renewalDate: '2025-12-31', 
        expiryDate: '2026-03-25', 
        autoReminder: true,
        diagramUrl: '', 
        diagramType: 'svg' as const 
      },
      { 
        id: '2', 
        customerId: '1', 
        name: 'Thales MFA', 
        licenseId: 'LIC-67890', 
        licenseType: 'Subscription',
        version: '2.1',
        licenseKey: 'YYYY-YYYY-YYYY-YYYY',
        description: 'MFA for remote access',
        totalLicenses: 500,
        licensesUsed: 420,
        autoCalculateUsage: true,
        allowOverAllocation: true,
        purchaseDate: '2025-01-15',
        startDate: '2025-02-01', 
        renewalDate: '2026-02-01', 
        expiryDate: '2026-06-01', 
        autoReminder: true,
        diagramUrl: '', 
        diagramType: 'svg' as const 
      }
    ],
    components: [
      { id: '1', productId: '1', name: 'Vault-01', type: 'Vault', site: 'DC', owner: 'John Doe', ip: '10.0.0.1', version: '12.6', icon: '', notes: 'Primary Vault', position: { x: 100, y: 100 } },
      { id: '2', productId: '1', name: 'PVWA-01', type: 'PVWA', site: 'DC', owner: 'Jane Smith', ip: '10.0.0.2', version: '12.6', icon: '', notes: 'Web Interface', position: { x: 400, y: 100 } },
      { id: '3', productId: '1', name: 'Vault-DR', type: 'Vault', site: 'DR', owner: 'John Doe', ip: '10.1.0.1', version: '12.6', icon: '', notes: 'DR Vault', position: { x: 100, y: 300 } }
    ],
    connections: [
      { id: '1', fromId: '2', toId: '1', protocol: 'TCP', port: '1858', allowedIp: '10.0.0.2', behavior: 'Allow', urls: ['https://vault.internal'] }
    ],
    icons: [
      { id: '1', name: 'Windows', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/windows8/windows8-original.svg' },
      { id: '2', name: 'Linux', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg' },
      { id: '3', name: 'Server', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/network-wired/network-wired-original.svg' }
    ],
    notifications: [
      { id: '1', type: 'expiry', title: 'License Expiring Soon', message: 'CyberArk PAM license for ABC Bank expires in 5 days.', timestamp: new Date().toISOString(), isRead: false, link: '/customers/1', customerId: '1' },
      { id: '2', type: 'security', title: 'New Admin Added', message: 'A new admin user was added to the system.', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false },
      { id: '3', type: 'system', title: 'System Backup Successful', message: 'The nightly database backup was completed successfully.', timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: true }
    ] as any[],
    sentAlerts: [] as { productId: string, threshold: number, timestamp: string }[],
    settings: {
      alertSettings: {
        reminderThresholds: [30, 7, 1, 0.020833333333333332], // 0.020833333333333332 is 30 mins (30/1440)
        telegramTemplate: "🔔 *License Expiration Alert*\n\nProduct: {productName}\nCustomer: {customerName}\nExpiry Date: {expiryDate}\nTime Remaining: {timeRemaining}\n\nPlease take action immediately.",
        globalTelegramToken: "",
        globalTelegramChatId: ""
      },
      componentTypes: [
        { id: '1', name: 'Windows' },
        { id: '2', name: 'Linux' },
        { id: '3', name: 'Vault' },
        { id: '4', name: 'PVWA' },
        { id: '5', name: 'CPM' },
        { id: '6', name: 'PSM' }
      ],
      sites: [
        { id: '1', name: 'DC' },
        { id: '2', name: 'DR' },
        { id: '3', name: 'CLOUD' }
      ],
      protocols: [
        { id: '1', name: 'TCP' },
        { id: '2', name: 'UDP' },
        { id: '3', name: 'HTTPS' },
        { id: '4', name: 'SSH' }
      ]
    },
    auditLogs: [] as any[]
  };

  const migrateDb = (data: any) => {
    const migrated = {
      ...defaultDb,
      ...data,
      settings: {
        ...defaultDb.settings,
        ...(data.settings || {}),
        alertSettings: {
          ...defaultDb.settings.alertSettings,
          ...(data.settings?.alertSettings || {})
        }
      }
    };

    // Ensure all top-level keys are arrays
    const arrayKeys = ['users', 'customers', 'products', 'components', 'connections', 'icons', 'notifications', 'sentAlerts', 'auditLogs'];
    arrayKeys.forEach(key => {
      if (!Array.isArray(migrated[key])) {
        migrated[key] = Array.isArray(data[key]) ? data[key] : (defaultDb[key as keyof typeof defaultDb] || []);
      }
    });

    // Ensure settings arrays are valid
    const settingsArrayKeys = ['componentTypes', 'sites', 'protocols'];
    settingsArrayKeys.forEach(key => {
      if (!Array.isArray(migrated.settings[key])) {
        migrated.settings[key] = Array.isArray(data.settings?.[key]) ? data.settings[key] : (defaultDb.settings[key as keyof typeof defaultDb.settings] || []);
      }
    });

    // Ensure alertSettings arrays are valid
    if (!Array.isArray(migrated.settings.alertSettings.reminderThresholds)) {
      migrated.settings.alertSettings.reminderThresholds = Array.isArray(data.settings?.alertSettings?.reminderThresholds) 
        ? data.settings.alertSettings.reminderThresholds 
        : defaultDb.settings.alertSettings.reminderThresholds;
    }

    // Final check: ensure users array is not empty
    if (migrated.users.length === 0) {
      migrated.users = defaultDb.users;
    }

    return migrated;
  };

  let db = defaultDb;

  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      db = migrateDb(parsed);
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }
  } catch (err) {
    console.error('Error reading db.json, using default db', err);
  }

  const saveDb = () => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error('Error saving db.json', err);
    }
  };

  const addNotification = (notif: any) => {
    db.notifications.unshift(notif);
    if (db.notifications.length > 100) {
      db.notifications = db.notifications.slice(0, 100);
    }
  };

  // Backup API
  app.get("/api/backup/export", (req, res) => {
    res.json(db);
  });

  app.post("/api/backup/import", (req, res) => {
    try {
      const importedDb = req.body;
      
      if (!importedDb || typeof importedDb !== 'object' || Array.isArray(importedDb)) {
        return res.status(400).json({ success: false, message: "Invalid backup format: expected a JSON object" });
      }

      console.log(`[${new Date().toISOString()}] Importing database...`);
      const migratedDb = migrateDb(importedDb);
      
      db = migratedDb;
      saveDb();
      console.log(`[${new Date().toISOString()}] Database imported successfully`);
      res.json({ success: true, message: "Database imported successfully" });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ success: false, message: "Failed to import database: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Alert Settings API
  app.get("/api/settings/alerts", (req, res) => res.json(db.settings.alertSettings));
  app.get("/api/settings/alerts/history", (req, res) => {
    const history = db.sentAlerts.map(alert => {
      const product = db.products.find(p => p.id === alert.productId);
      const customer = product ? db.customers.find(c => c.id === product.customerId) : null;
      return {
        ...alert,
        productName: product?.name || 'Unknown Product',
        customerName: customer?.name || 'Unknown Customer'
      };
    });
    res.json(history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  });
  app.put("/api/settings/alerts", (req, res) => {
    db.settings.alertSettings = { ...db.settings.alertSettings, ...req.body };
    res.json(db.settings.alertSettings);
  });

  app.post("/api/settings/alerts/test", async (req, res) => {
    const { globalTelegramToken, globalTelegramChatId } = db.settings.alertSettings;
    
    if (!globalTelegramToken || !globalTelegramChatId) {
      return res.status(400).json({ message: "Global Telegram integration not configured" });
    }
    
    try {
      const message = "🔔 *Global Alert Test*\n\nThis is a test message to verify your global Telegram configuration is working correctly.";
      const url = `https://api.telegram.org/bot${globalTelegramToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: globalTelegramChatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      const data = await response.json();

      if (data.ok) {
        res.json({ success: true });
      } else {
        throw new Error(data.description || "Failed to send Telegram message");
      }
    } catch (error: any) {
      console.error("Global Telegram Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Settings API
  app.get("/api/settings/:type", (req, res) => {
    const type = req.params.type as keyof typeof db.settings;
    if (db.settings[type]) res.json(db.settings[type]);
    else res.status(404).send();
  });

  app.post("/api/settings/:type", (req, res) => {
    const type = req.params.type as keyof typeof db.settings;
    if (Array.isArray(db.settings[type])) {
      const newItem = { id: String(Date.now()), ...req.body };
      (db.settings[type] as any[]).push(newItem);
      res.json(newItem);
    } else res.status(404).send();
  });

  app.delete("/api/settings/:type/:id", (req, res) => {
    const type = req.params.type as keyof typeof db.settings;
    if (Array.isArray(db.settings[type])) {
      db.settings[type] = (db.settings[type] as any[]).filter(item => item.id !== req.params.id) as any;
      res.json({ success: true });
    } else res.status(404).send();
  });

  // Auth API
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Account blocked due to too many failed attempts. Contact admin." });
    }

    if (user.password === password) {
      // Reset failed attempts on successful login
      user.failedLoginAttempts = 0;

      if (user.mfaEnabled) {
        return res.json({ 
          success: true, 
          mfaRequired: true,
          user: { id: user.id, username: user.username } 
        });
      }
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          mfaEnabled: user.mfaEnabled 
        } 
      });
    } else {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.isBlocked = true;
        return res.status(403).json({ success: false, message: "Account blocked due to too many failed attempts. Contact admin." });
      }
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  app.post("/api/auth/mfa/verify-login", (req, res) => {
    const { userId, code } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check backup codes first
    const backupCodeIndex = user.backupCodes?.indexOf(code);
    if (backupCodeIndex !== undefined && backupCodeIndex !== -1) {
      user.backupCodes.splice(backupCodeIndex, 1);
      return res.json({ 
        success: true, 
        user: { id: user.id, username: user.username, role: user.role, mfaEnabled: user.mfaEnabled } 
      });
    }

    // Check TOTP
    if (user.mfaSecret) {
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: code
      });
      if (verified) {
        return res.json({ 
          success: true, 
          user: { id: user.id, username: user.username, role: user.role, mfaEnabled: user.mfaEnabled } 
        });
      }
    }

    res.status(401).json({ success: false, message: "Invalid MFA code" });
  });

  app.post("/api/auth/mfa/setup", async (req, res) => {
    const { userId } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = speakeasy.generateSecret({ name: `Identity & Application Security (${user.username})` });
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    user.tempMfaSecret = secret.base32;
    res.json({ qrCodeUrl, secret: secret.base32 });
  });

  app.post("/api/auth/mfa/activate", (req, res) => {
    const { userId, code } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.tempMfaSecret) return res.status(400).json({ message: "MFA setup not initiated" });

    const verified = speakeasy.totp.verify({
      secret: user.tempMfaSecret,
      encoding: 'base32',
      token: code
    });

    if (verified) {
      user.mfaSecret = user.tempMfaSecret;
      user.mfaEnabled = true;
      user.tempMfaSecret = '';
      
      user.backupCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      
      res.json({ success: true, backupCodes: user.backupCodes });
    } else {
      res.status(400).json({ success: false, message: "Invalid verification code" });
    }
  });

  // Dashboard API
  app.post("/api/customers/:id/test-telegram", async (req, res) => {
    const customer = db.customers.find(c => c.id === req.params.id);
    if (!customer || !customer.telegramToken || !customer.telegramChatId) {
      return res.status(400).json({ message: "Telegram integration not configured" });
    }
    
    try {
      const message = "🔔 *Identity & Application Security Test Notification*\n\nThis is a test message to verify your Telegram integration is working correctly.";
      const url = `https://api.telegram.org/bot${customer.telegramToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: customer.telegramChatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      const data = await response.json();

      if (data.ok) {
        addNotification({
          id: String(Date.now()),
          type: 'system',
          title: 'Telegram Notification',
          customerId: customer.id,
          message: "Test notification sent successfully",
          timestamp: new Date().toISOString(),
          isRead: false
        });
        res.json({ success: true });
      } else {
        throw new Error(data.description || "Failed to send Telegram message");
      }
    } catch (error: any) {
      console.error("Telegram Error:", error);
      addNotification({
        id: String(Date.now()),
        type: 'system',
        title: 'Telegram Notification Error',
        customerId: customer.id,
        message: `Failed to send test notification: ${error.message}`,
        timestamp: new Date().toISOString(),
        isRead: false
      });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/notifications", (req, res) => {
    try {
      if (!Array.isArray(db.notifications)) {
        console.warn(`[${new Date().toISOString()}] db.notifications was not an array, resetting to []`);
        db.notifications = [];
      }
      console.log(`[${new Date().toISOString()}] GET /api/notifications - Count: ${db.notifications.length}`);
      res.json(db.notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/notifications/:id/read", (req, res) => {
    try {
      const index = db.notifications.findIndex(n => n.id === req.params.id);
      if (index !== -1) {
        db.notifications[index].isRead = true;
        console.log(`[${new Date().toISOString()}] Notification ${req.params.id} marked as read`);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/customers/:id/notifications", (req, res) => {
    try {
      if (!Array.isArray(db.notifications)) {
        db.notifications = [];
      }
      const notifications = db.notifications.filter((n: any) => n.customerId === req.params.id);
      res.json(notifications);
    } catch (error) {
      console.error(`Error fetching notifications for customer ${req.params.id}:`, error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/dashboard", (req, res) => {
    const now = new Date();
    const expiryStats = db.products.reduce((acc, p) => {
      const expiry = new Date(p.expiryDate);
      if (isNaN(expiry.getTime())) {
        acc.healthy++; // Default to healthy if date is invalid
        return acc;
      }
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) acc.expired++;
      else if (diffDays <= 30) acc.critical++;
      else if (diffDays <= 60) acc.warning++;
      else if (diffDays <= 90) acc.notice++;
      else acc.healthy++;
      
      return acc;
    }, { expired: 0, critical: 0, warning: 0, notice: 0, healthy: 0 });

    const expiringSoonProducts = db.products.filter(p => {
      const expiry = new Date(p.expiryDate);
      if (isNaN(expiry.getTime())) return false;
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 60;
    }).map(p => ({
      ...p,
      customerName: db.customers.find(c => c.id === p.customerId)?.name || 'Unknown Customer'
    }));

    const expiredProducts = db.products.filter(p => {
      const expiry = new Date(p.expiryDate);
      if (isNaN(expiry.getTime())) return false;
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 0;
    }).map(p => ({
      ...p,
      customerName: db.customers.find(c => c.id === p.customerId)?.name || 'Unknown Customer'
    }));

    res.json({
      totalCustomers: db.customers.length,
      totalProducts: db.products.length,
      expiryStats,
      topRiskCustomers: db.customers.slice(0, 3),
      customers: db.customers,
      products: db.products,
      components: db.components,
      expiredProducts,
      expiringSoonProducts,
      recentNotifications: db.notifications.slice(0, 5),
      siteStats: db.settings.sites.map(site => ({
        name: site.name,
        count: db.components.filter(c => c.site === site.name).length
      }))
    });
  });

  // Customers API
  app.get("/api/customers", (req, res) => res.json(db.customers));
  app.post("/api/customers", (req, res) => {
    const newCustomer = { id: String(Date.now()), ...req.body };
    db.customers.push(newCustomer);
    res.json(newCustomer);
  });
  app.put("/api/customers/:id", (req, res) => {
    const index = db.customers.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).send();
    db.customers[index] = { ...db.customers[index], ...req.body };
    res.json(db.customers[index]);
  });
  app.delete("/api/customers/:id", (req, res) => {
    db.customers = db.customers.filter(c => c.id !== req.params.id);
    db.products = db.products.filter(p => p.customerId !== req.params.id);
    res.json({ success: true });
  });

  app.post("/api/customers/:id/clone", (req, res) => {
    const originalCustomer = db.customers.find(c => c.id === req.params.id);
    if (!originalCustomer) return res.status(404).send();

    const newCustomerId = String(Date.now());
    const newCustomer = { 
      ...originalCustomer, 
      id: newCustomerId, 
      name: `${originalCustomer.name} (Copy)` 
    };
    db.customers.push(newCustomer);

    const oldToNewComponentIds: Record<string, string> = {};

    // Clone products
    const originalProducts = db.products.filter(p => p.customerId === originalCustomer.id);
    originalProducts.forEach((product, pIndex) => {
      const newProductId = `${newCustomerId}_p${pIndex}`;
      const newProduct = { ...product, id: newProductId, customerId: newCustomerId };
      db.products.push(newProduct);

      // Clone components for this product
      const originalComponents = db.components.filter(c => c.productId === product.id);
      originalComponents.forEach((comp, cIndex) => {
        const newComponentId = `${newProductId}_c${cIndex}`;
        oldToNewComponentIds[comp.id] = newComponentId;
        const newComponent = { ...comp, id: newComponentId, productId: newProductId };
        db.components.push(newComponent);
      });
    });

    // Clone connections
    const originalConnections = db.connections.filter(conn => 
      oldToNewComponentIds[conn.fromId] && oldToNewComponentIds[conn.toId]
    );
    originalConnections.forEach((conn, connIndex) => {
      const newConnectionId = `${newCustomerId}_conn${connIndex}`;
      const newConnection = {
        ...conn,
        id: newConnectionId,
        fromId: oldToNewComponentIds[conn.fromId],
        toId: oldToNewComponentIds[conn.toId]
      };
      db.connections.push(newConnection);
    });

    res.json(newCustomer);
  });

  app.get("/api/customers/:id", (req, res) => {
    const customer = db.customers.find(c => c.id === req.params.id);
    if (!customer) return res.status(404).send();
    
    // Mask sensitive data
    const maskedCustomer = {
      ...customer,
      telegramToken: customer.telegramToken ? '****************' : ''
    };
    
    const products = db.products.filter(p => p.customerId === customer.id);
    const components = db.components.filter(c => products.some(p => p.id === c.productId));
    res.json({ ...maskedCustomer, products, components });
  });

  // Icon Management API
  app.get("/api/icons", (req, res) => {
    res.json(db.icons);
  });

  app.post("/api/icons", (req, res) => {
    const newIcon = { id: String(Date.now()), ...req.body };
    db.icons.push(newIcon);
    res.json(newIcon);
  });

  app.delete("/api/icons/:id", (req, res) => {
    db.icons = db.icons.filter(i => i.id !== req.params.id);
    res.json({ success: true });
  });

  app.post("/api/components/positions", (req, res) => {
    const { positions } = req.body; // { [id]: { x, y } }
    Object.entries(positions).forEach(([id, pos]: [string, any]) => {
      const index = db.components.findIndex(c => c.id === id);
      if (index !== -1) {
        db.components[index].position = pos;
      }
    });
    res.json({ success: true });
  });

  // Products API
  app.post("/api/products", (req, res) => {
    const newProduct = { id: String(Date.now()), ...req.body };
    db.products.push(newProduct);
    res.json(newProduct);
  });
  app.put("/api/products/:id", (req, res) => {
    const index = db.products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).send();
    db.products[index] = { ...db.products[index], ...req.body };
    res.json(db.products[index]);
  });

  app.post("/api/products/:id/diagram", (req, res) => {
    const index = db.products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).send();
    const { diagramUrl, diagramType } = req.body;
    db.products[index].diagramUrl = diagramUrl;
    db.products[index].diagramType = diagramType;
    res.json(db.products[index]);
  });
  app.delete("/api/products/:id", (req, res) => {
    db.products = db.products.filter(p => p.id !== req.params.id);
    db.components = db.components.filter(c => c.productId !== req.params.id);
    res.json({ success: true });
  });

  // Components API
  app.get("/api/products/:id/components", (req, res) => {
    const components = db.components.filter(c => c.productId === req.params.id);
    const connections = db.connections.filter(conn => 
      components.some(c => c.id === conn.fromId || c.id === conn.toId)
    );
    res.json({ components, connections });
  });
  app.post("/api/components", (req, res) => {
    const newComponent = { id: String(Date.now()), ...req.body };
    db.components.push(newComponent);
    res.json(newComponent);
  });
  app.put("/api/components/:id", (req, res) => {
    const index = db.components.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).send();
    db.components[index] = { ...db.components[index], ...req.body };
    res.json(db.components[index]);
  });

  app.put("/api/components/:id/position", (req, res) => {
    const index = db.components.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).send();
    db.components[index].position = req.body;
    res.json({ success: true });
  });
  app.delete("/api/components/:id", (req, res) => {
    db.components = db.components.filter(c => c.id !== req.params.id);
    db.connections = db.connections.filter(conn => conn.fromId !== req.params.id && conn.toId !== req.params.id);
    res.json({ success: true });
  });

  // Connections API
  app.post("/api/connections", (req, res) => {
    const newConnection = { id: String(Date.now()), ...req.body };
    db.connections.push(newConnection);
    res.json(newConnection);
  });
  app.put("/api/connections/:id", (req, res) => {
    const index = db.connections.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).send();
    db.connections[index] = { ...db.connections[index], ...req.body };
    res.json(db.connections[index]);
  });
  app.delete("/api/connections/:id", (req, res) => {
    db.connections = db.connections.filter(c => c.id !== req.params.id);
    res.json({ success: true });
  });

  // Users API
  app.get("/api/users/me", (req, res) => {
    // In a real app, we'd use a session/token. For this mock, we'll return the first user or based on a mock header
    const userId = req.headers['x-user-id'] || '1';
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password, mfaSecret, tempMfaSecret, ...safeUser } = user;
    res.json(safeUser);
  });

  app.get("/api/users", (req, res) => res.json(db.users.map(({ password, mfaSecret, tempMfaSecret, ...u }) => u)));
  
  app.post("/api/users", (req, res) => {
    const { username, role } = req.body;
    if (db.users.find(u => u.username === username)) {
      return res.status(400).json({ message: "User already exists" });
    }
    const newUser = { 
      id: String(Date.now()), 
      username, 
      role, 
      password: 'password', 
      mfaEnabled: false,
      mfaSecret: '',
      tempMfaSecret: '',
      backupCodes: ['ABCD-1234', 'EFGH-5678', 'IJKL-9012'],
      isBlocked: false,
      failedLoginAttempts: 0
    };
    db.users.push(newUser);
    res.json(newUser);
  });

  app.get("/api/users/:id", (req, res) => {
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password, mfaSecret, tempMfaSecret, ...safeUser } = user;
    res.json(safeUser);
  });

  app.put("/api/users/:id", (req, res) => {
    const index = db.users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).send();
    
    const updates = { ...req.body };

    // Admin resetting MFA
    if (updates.mfaEnabled === false) {
      db.users[index].mfaEnabled = false;
      db.users[index].mfaSecret = '';
      db.users[index].backupCodes = [];
    }

    db.users[index] = { ...db.users[index], ...updates };
    const { password, mfaSecret, tempMfaSecret, ...safeUser } = db.users[index];
    res.json(safeUser);
  });

  app.post("/api/users/:id/reset-password", (req, res) => {
    const index = db.users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).send();
    db.users[index].password = req.body.password || 'password';
    res.json({ success: true });
  });
  app.delete("/api/users/:id", (req, res) => {
    if (req.params.id === '1') return res.status(400).json({ message: "Cannot delete primary admin" });
    db.users = db.users.filter(u => u.id !== req.params.id);
    res.json({ success: true });
  });

  // 404 handler for API routes - must be after all API routes but before Vite/Static middleware
  app.all('/api/*', (req, res) => {
    console.log(`[${new Date().toISOString()}] API 404: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: `API route not found: ${req.method} ${req.originalUrl}`,
      path: req.path,
      method: req.method
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Background Job for License Expiration Alerts
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const checkExpirations = async () => {
    console.log(`[${new Date().toISOString()}] Running background expiration check...`);
    try {
      const now = new Date();
      const alertSettings = db.settings?.alertSettings;
      
      if (!alertSettings || !alertSettings.reminderThresholds) {
        console.warn("Alert settings not found, skipping check.");
        return;
      }
      
      for (const product of db.products) {
        if (!product.autoReminder || !product.expiryDate) continue;
        
        const expiry = new Date(product.expiryDate);
        if (isNaN(expiry.getTime())) continue;
        
        const diffMs = expiry.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (diffDays < 0) continue; // Already expired

        // Check each threshold
        for (const threshold of alertSettings.reminderThresholds) {
          // If we are within the threshold (e.g. 30 days or 30 mins)
          // AND we haven't sent an alert for THIS threshold yet
          if (diffDays <= threshold) {
            const alreadySent = db.sentAlerts.some(a => a.productId === product.id && a.threshold === threshold);
            
            if (!alreadySent) {
              const customer = db.customers.find(c => c.id === product.customerId);
              if (!customer) continue;

              const token = customer.telegramToken || alertSettings.globalTelegramToken;
              const chatId = customer.telegramChatId || alertSettings.globalTelegramChatId;

              if (token && chatId) {
                let timeRemaining = "";
                if (threshold < 1) {
                  timeRemaining = `${Math.round(threshold * 1440)} minutes`;
                } else {
                  timeRemaining = `${Math.round(threshold)} days`;
                }

                const message = alertSettings.telegramTemplate
                  .replace("{productName}", product.name)
                  .replace("{customerName}", customer.name)
                  .replace("{expiryDate}", formatDate(product.expiryDate))
                  .replace("{timeRemaining}", timeRemaining);

                try {
                  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chatId,
                      text: message,
                      parse_mode: 'Markdown'
                    })
                  });

                  db.sentAlerts.push({
                    productId: product.id,
                    threshold,
                    timestamp: now.toISOString()
                  });
                  
                  addNotification({
                    id: String(Date.now()),
                    type: 'expiry',
                    title: 'Telegram Alert Sent',
                    message: `Expiration alert for ${product.name} (${customer.name}) sent to Telegram.`,
                    timestamp: now.toISOString(),
                    isRead: false,
                    link: `/customers/${customer.id}`
                  });
                  
                  console.log(`Alert sent for ${product.name} at threshold ${threshold}`);
                } catch (error) {
                  console.error("Failed to send background Telegram alert:", error);
                }
              }
            }
            break; // Only send the most urgent threshold alert
          }
        }
      }
    } catch (error) {
      console.error("Error in checkExpirations background job:", error);
    }
  };

  // Run every 5 minutes
  setInterval(checkExpirations, 5 * 60 * 1000);
  // Also run once on startup
  setTimeout(checkExpirations, 10000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
