'use client';

import { useRef, useState, MouseEvent, TouchEvent } from 'react';

interface ImageCropProps {
  imageSrc: string;
  onCrop: (file: File) => void;
  onUseFullImage: () => void;
}

export default function ImageCrop({ imageSrc, onCrop, onUseFullImage }: ImageCropProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const getPosFromEvent = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handleStart = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pos = getPosFromEvent(e);
    setIsSelecting(true);
    setStartPos(pos);
    setEndPos(pos);
  };

  const handleMove = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    if (!isSelecting) return;
    e.preventDefault();
    const pos = getPosFromEvent(e);
    setEndPos(pos);
  };

  const handleEnd = async () => {
    const wasSelecting = isSelecting;
    setIsSelecting(false);
    
    if (!wasSelecting) {
      onUseFullImage();
      return;
    }
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !imageLoaded) {
      onUseFullImage();
      return;
    }

    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);

    if (width < 10 || height < 10) {
      onUseFullImage();
      return;
    }

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    await new Promise<void>((resolve, reject) => {
      if (img.complete) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片加载失败'));
      }
    });

    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const x = Math.min(startPos.x, endPos.x);
    const y = Math.min(startPos.y, endPos.y);

    const cropX = x * scaleX;
    const cropY = y * scaleY;
    const cropWidth = width * scaleX;
    const cropHeight = height * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onUseFullImage();
      return;
    }

    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cropped-image.png', { type: 'image/png' });
        onCrop(file);
      } else {
        onUseFullImage();
      }
    }, 'image/png');
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
  };


  const selectionStyle = {
    left: `${Math.min(startPos.x, endPos.x)}px`,
    top: `${Math.min(startPos.y, endPos.y)}px`,
    width: `${Math.abs(endPos.x - startPos.x)}px`,
    height: `${Math.abs(endPos.y - startPos.y)}px`,
  };

  const hasSelection = Math.abs(endPos.x - startPos.x) > 10 && Math.abs(endPos.y - startPos.y) > 10;

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
        <div
          ref={containerRef}
          className="relative w-full h-full cursor-crosshair select-none"
          style={{ touchAction: 'none' }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        >
          <img
            src={imageSrc}
            alt="选择区域"
            className="w-full h-full object-contain"
            onLoad={handleImageLoad}
            draggable={false}
          />
          {isSelecting && hasSelection && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
              style={selectionStyle}
            />
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">
        在图片上拖拽选择区域，松开后自动应用
      </p>
    </div>
  );
}

