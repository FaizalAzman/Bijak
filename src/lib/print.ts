/**
 * Printing and sharing an HTML page as a PDF (practice sheets). Phones and tablets use
 * expo-print: the system print dialog, or a PDF file for the share sheet (WhatsApp, Drive, a
 * printer's app…). The web build prints the page from a hidden frame instead; the browser's
 * print dialog can save it as a PDF too.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface PageSetup {
  width: number;
  height: number;
  /** Used on iOS only (the other platforms take the page's CSS margins). */
  margins?: { top: number; right: number; bottom: number; left: number };
}

interface Frame {
  style: Record<string, string>;
  contentWindow: { document: { open(): void; write(html: string): void; close(): void }; focus(): void; print(): void } | null;
  remove(): void;
}
interface Doc {
  createElement(tag: 'iframe'): Frame;
  body: { appendChild(el: Frame): void };
}

/** How long the hidden frame stays around for the browser's print dialog to read it. */
export const FRAME_LIFETIME_MS = 60_000;

function printInFrame(html: string) {
  const doc = (globalThis as unknown as { document: Doc }).document;
  const frame = doc.createElement('iframe');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  doc.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    throw new Error('Printing is not available');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  setTimeout(() => frame.remove(), FRAME_LIFETIME_MS);
}

/** Opens the print dialog for the page. */
export async function printHtml(html: string, page: PageSetup): Promise<void> {
  if (Platform.OS === 'web') return printInFrame(html);
  await Print.printAsync({ html, ...page });
}

/** Makes a PDF of the page and opens the share sheet. */
export async function sharePdf(html: string, page: PageSetup, title: string): Promise<void> {
  if (Platform.OS === 'web') return printInFrame(html);
  const { uri } = await Print.printToFileAsync({ html, ...page });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
}
