/**
 * Printing and sharing a page as a PDF: expo-print on phones and tablets, a hidden frame on the web.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { FRAME_LIFETIME_MS, printHtml, sharePdf } from '@/lib/print';

const SIZE = { width: 595, height: 842, margins: { top: 45, right: 40, bottom: 45, left: 40 } };
const HTML = '<html><body>Sheet</body></html>';

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete (globalThis as { document?: unknown }).document;
});

describe('on a phone or tablet', () => {
  it('prints through the system print dialog, on A4', async () => {
    await printHtml(HTML, SIZE);
    expect(Print.printAsync).toHaveBeenCalledWith({ html: HTML, ...SIZE });
  });

  it('shares a PDF file through the share sheet', async () => {
    await sharePdf(HTML, SIZE, 'Fractions');
    expect(Print.printToFileAsync).toHaveBeenCalledWith({ html: HTML, ...SIZE });
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/sheet.pdf', { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Fractions' });
  });

  it('says so when the device cannot share files', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    await expect(sharePdf(HTML, SIZE, 'x')).rejects.toThrow('Sharing is not available');
  });
});

describe('on the web', () => {
  function fakeDocument(withWindow = true) {
    const win = { document: { open: jest.fn(), write: jest.fn(), close: jest.fn() }, focus: jest.fn(), print: jest.fn() };
    const frame = { style: {} as Record<string, string>, contentWindow: withWindow ? win : null, remove: jest.fn() };
    const doc = { createElement: jest.fn(() => frame), body: { appendChild: jest.fn() } };
    (globalThis as { document?: unknown }).document = doc;
    return { doc, frame, win };
  }

  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'web'));

  it('prints the page from a hidden frame, then tidies up', async () => {
    const { doc, frame, win } = fakeDocument();
    await printHtml(HTML, SIZE);
    expect(doc.body.appendChild).toHaveBeenCalledWith(frame);
    expect(frame.style).toMatchObject({ width: '0', height: '0', border: '0' });
    expect(win.document.write).toHaveBeenCalledWith(HTML);
    expect(win.print).toHaveBeenCalled();
    expect(Print.printAsync).not.toHaveBeenCalled();
    expect(frame.remove).not.toHaveBeenCalled();
    jest.advanceTimersByTime(FRAME_LIFETIME_MS);
    expect(frame.remove).toHaveBeenCalled();
  });

  it('“share” also opens the browser’s print dialog (which can save a PDF)', async () => {
    const { win } = fakeDocument();
    await sharePdf(HTML, SIZE, 'x');
    expect(win.print).toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('fails cleanly when the frame has no window', async () => {
    const { frame } = fakeDocument(false);
    await expect(printHtml(HTML, SIZE)).rejects.toThrow('Printing is not available');
    expect(frame.remove).toHaveBeenCalled();
  });
});
