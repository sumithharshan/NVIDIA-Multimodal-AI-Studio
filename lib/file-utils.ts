import { UploadedContextFile } from "./types";
import { uid } from "./storage";

const MAX_TEXT_CHARS = 16000;
const MAX_PDF_PAGES = 25;

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function extractPdfText(file: File): Promise<{ text: string; warning?: string }> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
    const buffer = await readAsArrayBuffer(file);
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const pagesToRead = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: unknown) => {
        if (typeof item === "object" && item && "str" in item) return String((item as { str: string }).str);
        return "";
      }).filter(Boolean).join(" ");
      pages.push(`--- Page ${pageNumber} ---\n${pageText}`);
    }

    const fullText = pages.join("\n\n").trim();
    const warnings: string[] = [];
    if (!fullText) warnings.push("PDF text could not be extracted. It may be scanned or image-based.");
    if (pdf.numPages > MAX_PDF_PAGES) warnings.push(`Only the first ${MAX_PDF_PAGES} pages were extracted.`);
    if (fullText.length > MAX_TEXT_CHARS) warnings.push(`Text was trimmed to ${MAX_TEXT_CHARS.toLocaleString()} characters.`);

    return { text: fullText.slice(0, MAX_TEXT_CHARS), warning: warnings.join(" ") || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF error.";
    return { text: "", warning: `PDF parsing failed: ${message}` };
  }
}

async function extractZipText(file: File): Promise<{ text: string; warning?: string }> {
  try {
    const JSZipModule = await import("jszip");
    const JSZip = JSZipModule.default || JSZipModule;
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    
    const extractedTexts: string[] = [];
    let totalLength = 0;
    const warnings: string[] = [];

    for (const [filename, zipEntry] of Object.entries(loadedZip.files)) {
      if (zipEntry.dir) {
        continue;
      }
      
      if (/\.(md|json|csv|txt)$/i.test(filename)) {
        const content = await zipEntry.async("text");
        const fileString = `--- File: ${filename} ---\n${content}`;
        extractedTexts.push(fileString);
        totalLength += fileString.length;
        
        if (totalLength > MAX_TEXT_CHARS) {
          warnings.push(`Zip contents were trimmed to ${MAX_TEXT_CHARS.toLocaleString()} characters.`);
          break;
        }
      }
    }

    const fullText = extractedTexts.join("\n\n").trim();
    if (!fullText) {
      warnings.push("No readable text files found inside the ZIP.");
    }

    return { text: fullText.slice(0, MAX_TEXT_CHARS), warning: warnings.join(" ") || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ZIP error.";
    return { text: "", warning: `ZIP parsing failed: ${message}` };
  }
}

async function parseSingleFile(file: File): Promise<UploadedContextFile> {
  const base = { id: uid("file"), name: file.name || "pasted-file", type: file.type || "unknown", size: file.size };

  if (file.type.startsWith("image/")) {
    return { ...base, dataUrl: await readAsDataUrl(file) };
  }

  if (file.type === "application/zip" || file.type === "application/x-zip-compressed" || file.name.toLowerCase().endsWith(".zip")) {
    const result = await extractZipText(file);
    return { ...base, text: result.text, warning: result.warning };
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const result = await extractPdfText(file);
    return { ...base, text: result.text, warning: result.warning };
  }

  if (file.type.startsWith("text/") || /\.(md|json|csv|txt)$/i.test(file.name)) {
    const text = await readAsText(file);
    return { ...base, text: text.slice(0, MAX_TEXT_CHARS), warning: text.length > MAX_TEXT_CHARS ? `File was trimmed to ${MAX_TEXT_CHARS.toLocaleString()} characters.` : undefined };
  }

  return { ...base, warning: "Unsupported file type. Use image, TXT, MD, JSON, CSV, ZIP or PDF." };
}

export async function parseFiles(files: FileList | File[]): Promise<UploadedContextFile[]> {
  return Promise.all(Array.from(files).map(parseSingleFile));
}

export async function parseClipboardItems(items: DataTransferItemList | DataTransferItem[]): Promise<UploadedContextFile[]> {
  const files: File[] = [];
  for (const item of Array.from(items)) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) files.push(new File([file], file.name || `pasted-image-${Date.now()}.png`, { type: file.type || "image/png" }));
    }
  }
  return parseFiles(files);
}

export function fileTextContext(files: UploadedContextFile[]) {
  return files.filter((file) => file.text).map((file) => `\n\n[File: ${file.name}]\n${file.text}`).join("\n");
}