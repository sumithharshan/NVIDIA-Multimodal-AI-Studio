import { UploadedContextFile } from "./types";
import { uid } from "./storage";

const MAX_TEXT_CHARS = 12000;
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
      const pageText = content.items
        .map((item: unknown) => {
          if (typeof item === "object" && item && "str" in item) return String((item as { str: string }).str);
          return "";
        })
        .filter(Boolean)
        .join(" ");

      pages.push(`--- Page ${pageNumber} ---\n${pageText}`);
    }

    const fullText = pages.join("\n\n").trim();
    const warnings: string[] = [];

    if (!fullText) warnings.push("PDF text could not be extracted. It may be scanned/image-based.");
    if (pdf.numPages > MAX_PDF_PAGES) warnings.push(`Only the first ${MAX_PDF_PAGES} pages were extracted.`);
    if (fullText.length > MAX_TEXT_CHARS) warnings.push(`PDF text was trimmed to ${MAX_TEXT_CHARS.toLocaleString()} characters.`);

    return {
      text: fullText.slice(0, MAX_TEXT_CHARS),
      warning: warnings.length ? warnings.join(" ") : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF parsing error.";
    return {
      text: "",
      warning: `PDF parsing failed: ${message}. Try converting the PDF to TXT or copy/paste the content.`,
    };
  }
}

async function parseSingleFile(file: File): Promise<UploadedContextFile> {
  const base = { id: uid("file"), name: file.name, type: file.type || "unknown", size: file.size };

  if (file.type.startsWith("image/")) {
    return { ...base, dataUrl: await readAsDataUrl(file), warning: "Image attached. Use a vision-capable model to analyze it, or qwen-image-edit to modify it." };
  }

  if (file.type.startsWith("audio/")) {
    return { ...base, dataUrl: await readAsDataUrl(file), warning: "Audio attached. The Magpie TTS model can use a short WAV voice sample when the endpoint supports it." };
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const result = await extractPdfText(file);
    return { ...base, text: result.text, warning: result.warning };
  }

  if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".json") || file.name.endsWith(".csv")) {
    const text = await readAsText(file);
    return {
      ...base,
      text: text.slice(0, MAX_TEXT_CHARS),
      warning: text.length > MAX_TEXT_CHARS ? `File was trimmed to ${MAX_TEXT_CHARS.toLocaleString()} characters.` : undefined,
    };
  }

  return { ...base, warning: "Unsupported file type. Convert it to TXT/MD/PDF or use an image file." };
}

export async function parseFiles(files: FileList | File[]): Promise<UploadedContextFile[]> {
  const list = Array.from(files);
  return Promise.all(list.map((file) => parseSingleFile(file)));
}

export async function parseClipboardItems(items: DataTransferItemList | DataTransferItem[]): Promise<UploadedContextFile[]> {
  const files: File[] = [];
  for (const item of Array.from(items)) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        const extension = file.type.split("/")[1] || "png";
        const namedFile = new File([file], file.name || `pasted-image-${Date.now()}.${extension}`, { type: file.type || "image/png" });
        files.push(namedFile);
      }
    }
  }
  return parseFiles(files);
}

export function filesToContext(files?: UploadedContextFile[]) {
  if (!files?.length) return "";
  return files
    .map((file) => {
      if (file.text) return `\n\n[File: ${file.name}]\n${file.text}`;
      if (file.dataUrl) return `\n\n[Image uploaded: ${file.name}] Use the attached image as context if the selected model supports vision.`;
      return `\n\n[File uploaded: ${file.name}] ${file.warning || "No extracted text available."}`;
    })
    .join("\n");
}
