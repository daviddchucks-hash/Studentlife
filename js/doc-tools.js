"use strict";

// Helper script loader for on-demand CDNs
const loadedScripts = new Map();

export function loadScript(url) {
  if (loadedScripts.has(url)) return loadedScripts.get(url);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load external library: ${url}`));
    document.head.appendChild(script);
  });
  loadedScripts.set(url, promise);
  return promise;
}

// 21. PDF Merger
export async function mergePDFs(fileList) {
  if (!fileList || fileList.length < 2) throw new Error("Please select at least 2 PDF files to merge.");
  await loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js");
  const PDFDocument = window.PDFLib.PDFDocument;

  const mergedPdf = await PDFDocument.create();
  for (const file of fileList) {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      throw new Error(`File ${file.name} is not a valid PDF.`);
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

// 22. PDF Splitter
export async function splitPDF(file, pageRangeStr) {
  if (!file || file.type !== "application/pdf") throw new Error("Please select a valid PDF file.");
  if (!pageRangeStr) throw new Error("Please specify the page numbers or ranges (e.g., 1, 3-5).");

  await loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js");
  const PDFDocument = window.PDFLib.PDFDocument;

  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const totalPages = srcPdf.getPageCount();

  // Parse page numbers
  const pageIndices = new Set();
  const parts = pageRangeStr.split(",");
  for (const part of parts) {
    const range = part.trim().split("-");
    if (range.length === 1) {
      const p = parseInt(range[0], 10);
      if (Number.isInteger(p) && p >= 1 && p <= totalPages) pageIndices.add(p - 1);
    } else if (range.length === 2) {
      const start = parseInt(range[0], 10);
      const end = parseInt(range[1], 10);
      if (Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end <= totalPages) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          pageIndices.add(i - 1);
        }
      }
    }
  }

  if (pageIndices.size === 0) throw new Error(`No valid pages selected. PDF has ${totalPages} pages.`);

  const newPdf = await PDFDocument.create();
  const sortedIndices = Array.from(pageIndices).sort((a, b) => a - b);
  const copiedPages = await newPdf.copyPages(srcPdf, sortedIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

// 23. PDF Compressor
export async function compressPDF(file) {
  if (!file || file.type !== "application/pdf") throw new Error("Please select a valid PDF file.");
  await loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js");
  const PDFDocument = window.PDFLib.PDFDocument;

  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Save with objects stream compression
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const compressedSize = pdfBytes.length;

  return {
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    originalSize,
    compressedSize,
    isSmaller: compressedSize < originalSize
  };
}

// 24. Image-to-PDF
export async function imageToPDF(imageFiles) {
  if (!imageFiles || imageFiles.length === 0) throw new Error("Select at least one image file (PNG, JPEG, WebP).");
  await loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js");
  const PDFDocument = window.PDFLib.PDFDocument;

  const pdfDoc = await PDFDocument.create();

  for (const imgFile of imageFiles) {
    const arrayBuffer = await imgFile.arrayBuffer();
    let img;
    if (imgFile.type === "image/png" || imgFile.name.endsWith(".png")) {
      img = await pdfDoc.embedPng(arrayBuffer);
    } else if (imgFile.type === "image/jpeg" || imgFile.type === "image/jpg" || imgFile.name.endsWith(".jpg") || imgFile.name.endsWith(".jpeg")) {
      img = await pdfDoc.embedJpg(arrayBuffer);
    } else {
      // Convert WebP/other formats via Canvas
      const blobUrl = URL.createObjectURL(imgFile);
      const tempImg = new Image();
      await new Promise((resolve, reject) => {
        tempImg.onload = resolve;
        tempImg.onerror = reject;
        tempImg.src = blobUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = tempImg.width;
      canvas.height = tempImg.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(tempImg, 0, 0);
      URL.revokeObjectURL(blobUrl);
      const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const base64Data = jpegDataUrl.split(",")[1];
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
      img = await pdfDoc.embedJpg(bytes);
    }

    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

// 26. Image Compressor
export async function compressImage(file, quality = 0.7, maxWidth = 1920) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Select a valid image file.");

  const originalSize = file.size;
  const image = new Image();
  const blobUrl = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = blobUrl;
  });

  let width = image.width;
  let height = image.height;
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(blobUrl);

  const compressedBlob = await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });

  return {
    blob: compressedBlob,
    originalSize,
    compressedSize: compressedBlob.size,
    isSmaller: compressedBlob.size < originalSize
  };
}

// 28. QR Code Generator
export async function generateQRCode(text) {
  if (!text || !text.trim()) throw new Error("Please enter text or a URL for the QR code.");
  await loadScript("https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js");

  const canvas = document.createElement("canvas");
  await window.QRCode.toCanvas(canvas, text.trim(), { width: 300, margin: 2 });
  return canvas;
}
