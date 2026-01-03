'use client';

import { useRef, useState, MouseEvent, TouchEvent, useEffect, useCallback } from 'react';

interface ImageWithCropProps {
  imageSrc: string;
  onCropAreaChange: (area: { x: number; y: number; width: number; height: number } | null) => void;
  cropArea?: { x: number; y: number; width: number; height: number } | null;
}

export default function ImageWithCrop({ imageSrc, onCropAreaChange, cropArea }: ImageWithCropProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null);

  const calculateImageDisplaySize = useCallback(() => {
    if (!containerRef.current || !imageRef.current || imageNaturalSize.width === 0) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
    const containerAspect = containerWidth / containerHeight;
    
    let displayWidth: number;
    let displayHeight: number;
    let offsetX: number;
    let offsetY: number;
    
    if (imageAspect > containerAspect) {
      displayWidth = containerWidth;
      displayHeight = containerWidth / imageAspect;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      displayWidth = containerHeight * imageAspect;
      displayHeight = containerHeight;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }
    
    setImageDisplaySize({ width: displayWidth, height: displayHeight, offsetX, offsetY });
    setContainerSize({ width: containerWidth, height: containerHeight });
  }, [imageNaturalSize]);

  useEffect(() => {
    const updateSize = () => {
      calculateImageDisplaySize();
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [calculateImageDisplaySize]);

  useEffect(() => {
    if (imageLoaded) {
      calculateImageDisplaySize();
    }
  }, [imageLoaded, calculateImageDisplaySize]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
  };

  useEffect(() => {
    if (imageDisplaySize.width > 0 && !cropBox && !cropArea) {
      const width = imageDisplaySize.width * 0.8;
      const height = imageDisplaySize.height * 0.8;
      const x = imageDisplaySize.offsetX + (imageDisplaySize.width - width) / 2;
      const y = imageDisplaySize.offsetY + (imageDisplaySize.height - height) / 2;
      setCropBox({ x, y, width, height });
    }
  }, [imageDisplaySize, cropBox, cropArea]);

  useEffect(() => {
    if (cropArea && imageLoaded && imageDisplaySize.width > 0) {
      const scaleX = imageDisplaySize.width / imageNaturalSize.width;
      const scaleY = imageDisplaySize.height / imageNaturalSize.height;
      setCropBox({
        x: imageDisplaySize.offsetX + cropArea.x * scaleX,
        y: imageDisplaySize.offsetY + cropArea.y * scaleY,
        width: cropArea.width * scaleX,
        height: cropArea.height * scaleY,
      });
    }
  }, [cropArea, imageLoaded, imageDisplaySize, imageNaturalSize]);

  const getPosFromEvent = (e: MouseEvent | TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const getResizeType = (x: number, y: number): 'resize' | 'move' | null => {
    if (!cropBox) return null;
    
    const handleSize = 20;
    const { x: boxX, y: boxY, width, height } = cropBox;
    
    const distanceX = Math.abs(x - (boxX + width));
    const distanceY = Math.abs(y - (boxY + height));
    
    if (distanceX <= handleSize / 2 && distanceY <= handleSize / 2) {
      return 'resize';
    }
    
    if (x >= boxX && x <= boxX + width && y >= boxY && y <= boxY + height) {
      return 'move';
    }
    
    return null;
  };

  const handleStart = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    if (!cropBox) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = getPosFromEvent(e);
    const type = getResizeType(pos.x, pos.y);
    
    if (type) {
      setIsDragging(true);
      setDragType(type);
      setDragStart({ x: pos.x - cropBox.x, y: pos.y - cropBox.y });
    }
  };

  const handleGlobalMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !cropBox || imageDisplaySize.width === 0) return;
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let clientX: number;
    let clientY: number;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const pos = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    
    if (dragType === 'move') {
      const minX = imageDisplaySize.offsetX;
      const minY = imageDisplaySize.offsetY;
      const maxX = imageDisplaySize.offsetX + imageDisplaySize.width - cropBox.width;
      const maxY = imageDisplaySize.offsetY + imageDisplaySize.height - cropBox.height;
      const newX = Math.max(minX, Math.min(pos.x - dragStart.x, maxX));
      const newY = Math.max(minY, Math.min(pos.y - dragStart.y, maxY));
      setCropBox({ ...cropBox, x: newX, y: newY });
    } else if (dragType === 'resize') {
      const maxWidth = imageDisplaySize.offsetX + imageDisplaySize.width - cropBox.x;
      const maxHeight = imageDisplaySize.offsetY + imageDisplaySize.height - cropBox.y;
      const newWidth = Math.max(50, Math.min(pos.x - cropBox.x, maxWidth));
      const newHeight = Math.max(50, Math.min(pos.y - cropBox.y, maxHeight));
      setCropBox({ ...cropBox, width: newWidth, height: newHeight });
    }
  }, [isDragging, cropBox, dragType, dragStart, imageDisplaySize]);

  const handleGlobalEnd = useCallback(() => {
    if (!isDragging || !cropBox || imageDisplaySize.width === 0) return;
    setIsDragging(false);
    setDragType(null);
    
    const scaleX = imageNaturalSize.width / imageDisplaySize.width;
    const scaleY = imageNaturalSize.height / imageDisplaySize.height;
    
    const cropData = {
      x: (cropBox.x - imageDisplaySize.offsetX) * scaleX,
      y: (cropBox.y - imageDisplaySize.offsetY) * scaleY,
      width: cropBox.width * scaleX,
      height: cropBox.height * scaleY,
    };
    
    onCropAreaChange(cropData);
  }, [isDragging, cropBox, imageDisplaySize, imageNaturalSize, onCropAreaChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMove as EventListener);
      document.addEventListener('mouseup', handleGlobalEnd);
      document.addEventListener('touchmove', handleGlobalMove as EventListener, { passive: false });
      document.addEventListener('touchend', handleGlobalEnd);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMove as EventListener);
        document.removeEventListener('mouseup', handleGlobalEnd);
        document.removeEventListener('touchmove', handleGlobalMove as EventListener);
        document.removeEventListener('touchend', handleGlobalEnd);
      };
    }
  }, [isDragging, handleGlobalMove, handleGlobalEnd]);

  if (!cropBox) {
    return (
      <div className="relative w-full aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
        <div ref={containerRef} className="relative w-full h-full">
          <img
            ref={imageRef}
            src={imageSrc}
            alt="预览"
            className="w-full h-full object-contain"
            onLoad={handleImageLoad}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      <div
        ref={containerRef}
        className="relative w-full h-full select-none"
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="预览"
          className="w-full h-full object-contain"
          onLoad={handleImageLoad}
        />
        
        <div
          className="absolute inset-0 bg-black/50 pointer-events-none z-10"
          style={{
            clipPath: `polygon(
              0% 0%,
              0% 100%,
              ${Math.round(cropBox.x)}px 100%,
              ${Math.round(cropBox.x)}px ${Math.round(cropBox.y)}px,
              ${Math.round(cropBox.x + cropBox.width)}px ${Math.round(cropBox.y)}px,
              ${Math.round(cropBox.x + cropBox.width)}px ${Math.round(cropBox.y + cropBox.height)}px,
              ${Math.round(cropBox.x)}px ${Math.round(cropBox.y + cropBox.height)}px,
              ${Math.round(cropBox.x)}px 100%,
              100% 100%,
              100% 0%
            )`,
          }}
        />
        
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: `${Math.round(cropBox.x)}px`,
            top: `${Math.round(cropBox.y)}px`,
            width: `${Math.round(cropBox.width)}px`,
            height: `${Math.round(cropBox.height)}px`,
            outline: '2px solid white',
            outlineOffset: '-2px',
          }}
        />
        
        <div
          className="absolute bg-transparent z-30 cursor-move"
          style={{
            left: `${Math.round(cropBox.x)}px`,
            top: `${Math.round(cropBox.y)}px`,
            width: `${Math.round(cropBox.width)}px`,
            height: `${Math.round(cropBox.height)}px`,
            touchAction: 'none',
          }}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
        />
        
        <div
          className="absolute bg-white rounded-full z-30 cursor-nwse-resize"
          style={{
            left: `${Math.round(cropBox.x + cropBox.width - 10)}px`,
            top: `${Math.round(cropBox.y + cropBox.height - 10)}px`,
            width: '20px',
            height: '20px',
            touchAction: 'none',
          }}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
        />
      </div>
    </div>
  );
}
