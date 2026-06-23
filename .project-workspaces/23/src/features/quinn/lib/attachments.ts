// Client-side attachment processing for MarQ chat.
// Images → base64 (sent to Claude as vision blocks).
// PDFs → text extracted via pdfjs-dist.
// Text-like files → read as text.

import * as pdfjsLib from 'pdfjs-dist';
// Use the bundled worker via Vite's ?url import so it works offline.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ImageAttachment {
  kind: 'image';
  name: string;
  mediaType: string; // image/png | image/jpeg | image/webp | image/gif
  base64: string;    // raw base64, no data: prefix
}

export interface TextAttachment {
  kind: 'text';
  name: string;
  text: string; // truncated to ~20k chars
}

export type Attachment = ImageAttachment | TextAttachment;

const TEXT_CHAR_CAP = 20000;

const isImage = (file: File) => file.type.startsWith('image/');
const isPdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function pdfToText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  const pages = Math.min(doc.numPages, 30); // cap for safety
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ('str' in it ? (it as { str: string }).str : ''))
      .join(' ');
    parts.push(pageText);
    if (parts.join('\n').length > TEXT_CHAR_CAP) break;
  }
  return parts.join('\n\n').slice(0, TEXT_CHAR_CAP);
}

export async function processFile(file: File): Promise<Attachment> {
  if (isImage(file)) {
    const base64 = await fileToBase64(file);
    return {
      kind: 'image',
      name: file.name,
      mediaType: file.type || 'image/png',
      base64,
    };
  }
  if (isPdf(file)) {
    const text = await pdfToText(file);
    return {
      kind: 'text',
      name: file.name,
      text: text || '(no extractable text — image-only PDF)',
    };
  }
  // Treat as text file
  const text = (await file.text()).slice(0, TEXT_CHAR_CAP);
  return { kind: 'text', name: file.name, text };
}
