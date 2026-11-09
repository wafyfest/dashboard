/**
 * Utilities for formatting contact links (phone, WhatsApp)
 */

export function getTelLink(phone?: string | null): string {
  if (!phone) return '#';
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
}

export function getWhatsAppLink(phone?: string | null): string {
  if (!phone) return '#';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`; // Default to India country code
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }
  return `https://wa.me/${digits}`;
}

