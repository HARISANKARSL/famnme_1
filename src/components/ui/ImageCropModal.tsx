/**
 * ImageCropModal — Circular crop overlay for profile photos.
 * Uses react-easy-crop for pan/zoom, outputs a cropped File.
 */

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react';

interface ImageCropModalProps {
  imageUrl: string;
  onCropDone: (croppedFile: File) => void;
  onCancel: () => void;
}

/** Draw the cropped area on a canvas and return a File. */
async function getCroppedFile(
  imageSrc: string,
  crop: Area,
  rotation: number
): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Output size — 800px square is good for profile photos
  const outputSize = Math.min(800, crop.width);
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Handle rotation
  const rad = (rotation * Math.PI) / 180;

  // Create a temporary canvas for rotation
  const rotCanvas = document.createElement('canvas');
  const rotCtx = rotCanvas.getContext('2d')!;

  if (rotation !== 0) {
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    rotCanvas.width = img.width * cos + img.height * sin;
    rotCanvas.height = img.width * sin + img.height * cos;
    rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
    rotCtx.rotate(rad);
    rotCtx.drawImage(img, -img.width / 2, -img.height / 2);
  }

  const source = rotation !== 0 ? rotCanvas : img;

  ctx.drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.92
    )
  );

  return new File([blob], 'profile-cropped.jpg', { type: 'image/jpeg' });
}

export function ImageCropModal({ imageUrl, onCropDone, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  const handleDone = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const file = await getCroppedFile(imageUrl, croppedArea, rotation);
      onCropDone(file);
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-3 bg-[#ffffff] dark:bg-[#292827] rounded-xl shadow-fluent-16 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE9] dark:border-[#484644]">
          <h3 className="text-sm font-semibold text-[#323130] dark:text-[#F3F2F1]">
            Crop Profile Photo
          </h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-[#F3F2F1] dark:hover:bg-[#323130]">
            <X className="w-4 h-4 text-[#605E5C] dark:text-[#D2D0CE]" />
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative w-full" style={{ height: 360 }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="px-4 py-3 space-y-3 border-t border-[#EDEBE9] dark:border-[#484644]">
          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-[#605E5C] dark:text-[#D2D0CE] flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 accent-[#2F3E8F] cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-[#605E5C] dark:text-[#D2D0CE] flex-shrink-0" />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCw className="w-3.5 h-3.5 mr-1.5" />
              Rotate
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleDone} disabled={saving}>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Cropping...' : 'Apply'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
