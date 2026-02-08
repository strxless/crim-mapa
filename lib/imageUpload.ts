"use client";

export type UploadKind = "pins" | "visits";

type CompressOptions = {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0..1
};

type ImageBitmapOptionsWithOrientation = ImageBitmapOptions & {
  imageOrientation?: "from-image" | "none";
};

const DEFAULT_COMPRESS: CompressOptions = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.75,
};

function randomId(bytes = 12) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function supportsCanvasMimeType(type: string) {
  try {
    const canvas = document.createElement("canvas");
    const data = canvas.toDataURL(type);
    return data.startsWith(`data:${type}`);
  } catch {
    return false;
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Failed to encode image"));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

async function drawFileToCanvas(file: File, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Prefer createImageBitmap (can respect EXIF orientation via imageOrientation).
  if (typeof createImageBitmap !== "undefined") {
    const bitmap = await createImageBitmap(
      file,
      { imageOrientation: "from-image" } as ImageBitmapOptionsWithOrientation
    );

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    return canvas;
  }

  // Fallback: <img> (generally respects EXIF orientation when decoding)
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(file: File, options: Partial<CompressOptions> = {}) {
  const opts: CompressOptions = { ...DEFAULT_COMPRESS, ...options };

  // Load dimensions (without drawing full-res if possible)
  let srcW = 0;
  let srcH = 0;

  if (typeof createImageBitmap !== "undefined") {
    const bitmap = await createImageBitmap(
      file,
      { imageOrientation: "from-image" } as ImageBitmapOptionsWithOrientation
    );
    srcW = bitmap.width;
    srcH = bitmap.height;
    bitmap.close?.();
  } else {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      srcW = img.naturalWidth || img.width;
      srcH = img.naturalHeight || img.height;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const scale = Math.min(1, opts.maxWidth / srcW, opts.maxHeight / srcH);
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  const canvas = await drawFileToCanvas(file, dstW, dstH);

  const targetType = supportsCanvasMimeType("image/webp") ? "image/webp" : "image/jpeg";
  const blob = await canvasToBlob(canvas, targetType, opts.quality);

  return blob;
}

export async function uploadImageFile(file: File, kind: UploadKind) {
  const compressed = await compressImage(file);
  return uploadImage(compressed);
}

/**
 * Upload a compressed image via /api/uploads.
 * The server decides where to store it (Vercel Blob in prod, local disk in dev).
 */
export async function uploadImage(fileOrBlob: File | Blob): Promise<string> {
  const compressed = fileOrBlob instanceof File
    ? await compressImage(fileOrBlob, { maxWidth: 1024, maxHeight: 1024, quality: 0.65 })
    : fileOrBlob;

  const fd = new FormData();
  const ext = compressed.type === "image/webp" ? "webp" : "jpg";
  fd.append("file", compressed, `photo.${ext}`);

  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => "Upload failed");
    throw new Error(text);
  }

  const data = await res.json();
  return data.url;
}

export async function deleteUploadedUrl(url: string) {
  await fetch("/api/blob/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
}
