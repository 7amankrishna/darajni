const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_IMAGE_SOURCE_BYTES = 25 * 1024 * 1024;

const MAX_IMAGE_WIDTH = 1440;
const MAX_IMAGE_HEIGHT = 1800;
const TARGET_IMAGE_BYTES = 700 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MIN_LONG_EDGE = 640;
const WEBP_QUALITIES = [0.78, 0.68, 0.58];

export interface OptimizedImage {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  optimizedBytes: number;
  wasCompressed: boolean;
}

function calculateSize(width: number, height: number) {
  const scale = Math.min(1, MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("This browser could not compress the image."));
      },
      type,
      quality,
    );
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected image could not be read."));
    };
    image.src = objectUrl;
  });
}

function renderImage(
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("This browser does not support image compression.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

function resizeCanvas(source: HTMLCanvasElement, width: number, height: number) {
  return renderImage(source, width, height);
}

function optimizedFileName(originalName: string, type: string) {
  const baseName = originalName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-");
  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return `${baseName || "product-image"}.${extensionByType[type] || "webp"}`;
}

export async function optimizeImage(file: File): Promise<OptimizedImage> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_IMAGE_SOURCE_BYTES) {
    throw new Error("The original image must be smaller than 25 MB.");
  }

  const image = await loadImage(file);
  const initialSize = calculateSize(image.naturalWidth, image.naturalHeight);
  let canvas = renderImage(image, initialSize.width, initialSize.height);
  let smallestBlob: Blob | null = null;

  for (let resizePass = 0; resizePass < 3; resizePass += 1) {
    for (const quality of WEBP_QUALITIES) {
      const blob = await canvasToBlob(canvas, "image/webp", quality);
      if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
      if (blob.size <= TARGET_IMAGE_BYTES) {
        smallestBlob = blob;
        break;
      }
    }

    if (smallestBlob && smallestBlob.size <= TARGET_IMAGE_BYTES) break;
    if (!smallestBlob || resizePass === 2) continue;

    const targetScale = Math.max(
      0.72,
      Math.min(0.9, Math.sqrt(TARGET_IMAGE_BYTES / smallestBlob.size) * 0.95),
    );
    const scale = Math.max(targetScale, MIN_LONG_EDGE / Math.max(canvas.width, canvas.height));
    const nextWidth = Math.max(1, Math.round(canvas.width * scale));
    const nextHeight = Math.max(1, Math.round(canvas.height * scale));
    if (nextWidth >= canvas.width && nextHeight >= canvas.height) break;
    canvas = resizeCanvas(canvas, nextWidth, nextHeight);
    smallestBlob = null;
  }

  if (!smallestBlob || smallestBlob.size > MAX_OUTPUT_BYTES) {
    throw new Error("The image could not be reduced below the 2 MB upload limit.");
  }

  const resized = canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight;
  const shouldKeepOriginal =
    !resized &&
    file.size <= smallestBlob.size &&
    file.size <= MAX_OUTPUT_BYTES;
  const output = shouldKeepOriginal ? file : smallestBlob;
  const outputType = shouldKeepOriginal ? file.type : smallestBlob.type || "image/webp";
  const optimizedFile =
    output instanceof File
      ? output
      : new File([output], optimizedFileName(file.name, outputType), {
          type: outputType,
          lastModified: file.lastModified,
        });

  return {
    file: optimizedFile,
    width: shouldKeepOriginal ? image.naturalWidth : canvas.width,
    height: shouldKeepOriginal ? image.naturalHeight : canvas.height,
    originalBytes: file.size,
    optimizedBytes: optimizedFile.size,
    wasCompressed: !shouldKeepOriginal,
  };
}
