/**
 * Book Generation Service
 *
 * Assembles family tree data into HTML chapters for print/PDF export.
 */

import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';

/** Escape HTML entities to prevent XSS in generated book HTML */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface BookOptions {
  scope: 'full' | 'branch' | 'ancestors' | 'descendants';
  template: 'timeline' | 'generational' | 'person-by-person';
  personId?: string;
  maxDepth?: number;
  includePhotos: boolean;
  includeLifeEvents: boolean;
  includeCulturalData: boolean;
}

interface PersonData {
  personId: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  occupation?: string;
  biography?: string;
  isLiving?: boolean;
  gender?: string;
  gotra?: string;
  religion?: string;
  profilePhotoUrl?: string;
}

export async function fetchBookData(treeId: string, options: BookOptions): Promise<{ persons: PersonData[] }> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/tree/${treeId}/reports/book-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ scope: options.scope, personId: options.personId, maxDepth: options.maxDepth }),
  });
  if (!response.ok) throw new Error('Failed to fetch book data');
  return response.json();
}

export function generateBookHtml(persons: PersonData[], options: BookOptions, treeName: string): string {
  const styles = `
    <style>
      body { font-family: Georgia, serif; color: #333; max-width: 700px; margin: 0 auto; padding: 40px 20px; }
      h1 { text-align: center; color: #8B4513; border-bottom: 2px solid #D2B48C; padding-bottom: 10px; }
      h2 { color: #A0522D; margin-top: 30px; }
      h3 { color: #8B4513; }
      .person-entry { page-break-inside: avoid; margin-bottom: 30px; padding: 15px; border-left: 3px solid #D2B48C; }
      .person-name { font-size: 1.2em; font-weight: bold; }
      .person-dates { color: #666; font-style: italic; }
      .person-detail { margin: 5px 0; }
      .toc { margin: 20px 0; }
      .toc a { text-decoration: none; color: #8B4513; }
      @media print { .person-entry { page-break-inside: avoid; } }
    </style>
  `;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(treeName)} - Family Book</title>${styles}</head><body>`;
  html += `<h1>${esc(treeName)}</h1>`;
  const generatedDate = (() => {
    try {
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}-${mm}-${yy}`;
    } catch {
      return new Date().toLocaleDateString();
    }
  })();
  html += `<p style="text-align: center; color: #666;">Generated on ${generatedDate}</p>`;

  // Table of contents
  html += `<div class="toc"><h2>Contents</h2><ul>`;
  persons.forEach((p, i) => {
    html += `<li><a href="#person-${i}">${esc(p.firstName)} ${esc(p.lastName)}</a></li>`;
  });
  html += `</ul></div>`;

  // Person entries
  persons.forEach((p, i) => {
    html += `<div class="person-entry" id="person-${i}">`;
    html += `<div class="person-name">${esc(p.firstName)} ${esc(p.lastName)}</div>`;

    const dates = [];
    if (p.birthDate) dates.push(`b. ${esc(p.birthDate)}`);
    if (p.deathDate) dates.push(`d. ${esc(p.deathDate)}`);
    else if (p.isLiving) dates.push('Living');
    if (dates.length) html += `<div class="person-dates">${dates.join(' — ')}</div>`;

    if (p.birthPlace) html += `<div class="person-detail"><strong>Born:</strong> ${esc(p.birthPlace)}</div>`;
    if (p.occupation) html += `<div class="person-detail"><strong>Occupation:</strong> ${esc(p.occupation)}</div>`;

    if (options.includeCulturalData) {
      if (p.gotra) html += `<div class="person-detail"><strong>Gotra:</strong> ${esc(p.gotra)}</div>`;
      if (p.religion) html += `<div class="person-detail"><strong>Religion:</strong> ${esc(p.religion)}</div>`;
    }

    if (p.biography) html += `<p>${esc(p.biography)}</p>`;
    html += `</div>`;
  });

  html += `</body></html>`;
  return html;
}

export function downloadAsHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printBook(html: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
