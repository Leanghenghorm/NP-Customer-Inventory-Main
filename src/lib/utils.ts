import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date.toString();
  
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
}

export function getLicenseStatus(product: any) {
  const { expiryDate, totalLicenses, licensesUsed, allowOverAllocation } = product;
  
  // Check for over-allocation first
  if ((licensesUsed || 0) > (totalLicenses || 0) && !allowOverAllocation) {
    return { label: 'Over-allocated', color: 'bg-red-500', text: 'text-red-500' };
  }

  if (!expiryDate || expiryDate.toLowerCase() === 'unlimited') {
    return { label: 'Unlimited', color: 'bg-blue-500', text: 'text-blue-500' };
  }

  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'Expired', color: 'bg-red-500', text: 'text-red-500' };
  if (diffDays <= 30) return { label: 'Critical', color: 'bg-red-500', text: 'text-red-500' };
  if (diffDays <= 60) return { label: 'Warning', color: 'bg-orange-500', text: 'text-orange-500' };
  if (diffDays <= 90) return { label: 'Notice', color: 'bg-yellow-500', text: 'text-yellow-500' };
  return { label: 'Healthy', color: 'bg-emerald-500', text: 'text-emerald-500' };
}

export function calculateSecurityScore(products: any[], components: any[]) {
  if (products.length === 0) return 100;

  let totalScore = 0;
  
  // 1. License Score (60% weight)
  let licenseScore = 0;
  products.forEach(p => {
    let pScore = 0;
    const status = getLicenseStatus(p);
    switch (status.label) {
      case 'Unlimited': pScore = 100; break;
      case 'Healthy': pScore = 100; break;
      case 'Notice': pScore = 80; break;
      case 'Warning': pScore = 50; break;
      case 'Critical': pScore = 20; break;
      case 'Expired': pScore = 0; break;
      case 'Over-allocated': pScore = 0; break;
    }

    // Penalize for over-allocation if not allowed
    if ((p.licensesUsed || 0) > (p.totalLicenses || 0)) {
      if (!p.allowOverAllocation) {
        pScore = Math.max(0, pScore - 50); // Heavy penalty
      } else {
        pScore = Math.max(0, pScore - 20); // Light penalty even if allowed
      }
    }

    licenseScore += pScore;
  });
  licenseScore = (licenseScore / products.length) * 0.6;

  // 2. Version Score (40% weight)
  // For this demo, we'll assume a component is "secure" if it's on a recent-ish version
  // In a real app, this would check against a vulnerability database
  let versionScore = 0;
  if (components.length > 0) {
    components.forEach(c => {
      // Mock logic: if version starts with '1', it's older/risky
      if (c.version.startsWith('1.')) versionScore += 50;
      else versionScore += 100;
    });
    versionScore = (versionScore / components.length) * 0.4;
  } else {
    versionScore = 40; // Default if no components
  }

  totalScore = Math.round(licenseScore + versionScore);
  return Math.min(100, Math.max(0, totalScore));
}

export async function safeFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}\n${text.substring(0, 200)}`);
  }
  
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error(`Failed to parse JSON from ${url}. Response starts with: ${text.substring(0, 100)}`);
    throw new Error(`Invalid JSON response from ${url}`);
  }
}
