'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEYS = {
  boxThreshold: 'unveil_box_threshold',
  textThreshold: 'unveil_text_threshold',
  topK: 'unveil_top_k',
};
import Image from 'next/image';
import ImageUpload from '@/components/ImageUpload';
import ImageWithCrop from '@/components/ImageWithCrop';
import PredictionResults from '@/components/PredictionResults';
import PredictionResultsSkeleton from '@/components/PredictionResultsSkeleton';
import LoadingSpinner from '@/components/LoadingSpinner';
import SegmentResults from '@/components/SegmentResults';
import { segmentImage, predictEquipment } from '@/lib/api';
import type { PredictionResult, SegmentResponse } from '@/lib/types';

type ProcessingState = 'idle' | 'segmenting' | 'predicting' | 'complete' | 'error';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);
  const [segmentResults, setSegmentResults] = useState<SegmentResponse | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [boxThreshold, setBoxThreshold] = useState(0.3);
  const [textThreshold, setTextThreshold] = useState(0.25);
  const [topK, setTopK] = useState(5);
  const [isClient, setIsClient] = useState(false);
  const lastProcessedRef = useRef<{
    imageKey: string | null;
    cropAreaKey: string | null;
    boxThreshold: number | null;
    textThreshold: number | null;
  }>({ imageKey: null, cropAreaKey: null, boxThreshold: null, textThreshold: null });

  useEffect(() => {
    setIsClient(true);
    const savedBoxThreshold = localStorage.getItem(STORAGE_KEYS.boxThreshold);
    const savedTextThreshold = localStorage.getItem(STORAGE_KEYS.textThreshold);
    const savedTopK = localStorage.getItem(STORAGE_KEYS.topK);
    
    if (savedBoxThreshold) {
      setBoxThreshold(parseFloat(savedBoxThreshold));
    }
    if (savedTextThreshold) {
      setTextThreshold(parseFloat(savedTextThreshold));
    }
    if (savedTopK) {
      setTopK(parseInt(savedTopK));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.boxThreshold, boxThreshold.toString());
  }, [boxThreshold]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.textThreshold, textThreshold.toString());
  }, [textThreshold]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.topK, topK.toString());
  }, [topK]);

  const handleImageSelect = useCallback((file: File) => {
    setSelectedImage(file);
    setPredictionResults([]);
    setError(null);
    setProcessingState('idle');
    setCropArea(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCropAreaChange = useCallback((area: { x: number; y: number; width: number; height: number } | null) => {
    setCropArea(area);
  }, []);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const file = new File([blob], 'pasted-image.png', { type: blob.type });
            handleImageSelect(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleImageSelect]);

  const handleProcess = useCallback(async () => {
    if (!selectedImage || !imagePreview) return;

    const imageKey = `${selectedImage.name}-${selectedImage.size}-${selectedImage.lastModified}`;
    const cropAreaKey = cropArea 
      ? `${cropArea.x}-${cropArea.y}-${cropArea.width}-${cropArea.height}` 
      : 'no-crop';

    if (
      lastProcessedRef.current.imageKey === imageKey &&
      lastProcessedRef.current.cropAreaKey === cropAreaKey &&
      lastProcessedRef.current.boxThreshold === boxThreshold &&
      lastProcessedRef.current.textThreshold === textThreshold &&
      processingState === 'complete'
    ) {
      return;
    }

    setError(null);
    setProcessingState('segmenting');

    try {
      let imageToProcess: File = selectedImage;
      setCroppedImageFile(selectedImage);

      if (cropArea && cropArea.width >= 10 && cropArea.height >= 10) {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.src = imagePreview;
        await new Promise<void>((resolve, reject) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('图片加载失败'));
          }
        });

        const canvas = document.createElement('canvas');
        canvas.width = cropArea.width;
        canvas.height = cropArea.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            img,
            cropArea.x,
            cropArea.y,
            cropArea.width,
            cropArea.height,
            0,
            0,
            cropArea.width,
            cropArea.height
          );
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/png');
          });
          if (blob) {
            imageToProcess = new File([blob], 'cropped-image.png', { type: 'image/png' });
            setCroppedImageFile(imageToProcess);
          }
        }
      }

      const segmentData = await segmentImage(imageToProcess, boxThreshold, textThreshold);
      setSegmentResults(segmentData);
      setProcessingState('predicting');

      if (!segmentData.upper) {
        throw new Error('未能分割出上身部位');
      }

      const base64 = segmentData.upper;
      const response = await fetch(`data:image/png;base64,${base64}`);
      const blob = await response.blob();
      const file = new File([blob], 'upper.png', { type: 'image/png' });

      const predictData = await predictEquipment(file, topK);
      setPredictionResults(predictData.results);
      setProcessingState('complete');
      
      lastProcessedRef.current = {
        imageKey,
        cropAreaKey,
        boxThreshold,
        textThreshold,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
      setProcessingState('error');
    }
  }, [selectedImage, imagePreview, cropArea, boxThreshold, textThreshold, topK, processingState]);

  const handleReset = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setPredictionResults([]);
    setSegmentResults(null);
    setProcessingState('idle');
    setError(null);
    setCroppedImageFile(null);
    lastProcessedRef.current = { imageKey: null, cropAreaKey: null, boxThreshold: null, textThreshold: null };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light text-gray-800 mb-2">Unveil</h1>
          <p className="text-sm text-gray-500 font-light">FFXIV 装备识别系统</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col space-y-4">
            {!imagePreview ? (
              <>
                <ImageUpload
                  onImageSelect={handleImageSelect}
                  disabled={processingState === 'segmenting' || processingState === 'predicting'}
                />
                <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 font-light">
                        检测框阈值
                      </label>
                      <span className="text-xs text-gray-500 font-light">
                        {boxThreshold.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="0.5"
                      step="0.05"
                      value={boxThreshold}
                      onChange={(e) => setBoxThreshold(parseFloat(e.target.value))}
                      disabled={processingState === 'segmenting' || processingState === 'predicting'}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: `linear-gradient(to right, #9ca3af 0%, #9ca3af ${(boxThreshold - 0.2) / 0.3 * 100}%, #e5e7eb ${(boxThreshold - 0.2) / 0.3 * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <p className="text-xs text-gray-400 font-light">
                      控制检测框的识别敏感度，值越高越严格，可能漏检；值越低越宽松，可能误检
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 font-light">
                        文本识别阈值
                      </label>
                      <span className="text-xs text-gray-500 font-light">
                        {textThreshold.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={textThreshold}
                      onChange={(e) => setTextThreshold(parseFloat(e.target.value))}
                      disabled={processingState === 'segmenting' || processingState === 'predicting'}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: `linear-gradient(to right, #9ca3af 0%, #9ca3af ${(textThreshold - 0.1) / 0.8 * 100}%, #e5e7eb ${(textThreshold - 0.1) / 0.8 * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <p className="text-xs text-gray-400 font-light">
                      文本-图像匹配阈值：只有与提示词匹配分数 ≥ 此值的检测框才会被保留。调高更严格（只保留高度匹配），调低更宽松（可能包含匹配度较低的检测）
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 font-light">
                        返回结果数量
                      </label>
                      <span className="text-xs text-gray-500 font-light">
                        {topK}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value))}
                      disabled={processingState === 'segmenting' || processingState === 'predicting'}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: `linear-gradient(to right, #9ca3af 0%, #9ca3af ${((topK - 1) / 9) * 100}%, #e5e7eb ${((topK - 1) / 9) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <p className="text-xs text-gray-400 font-light">
                      控制返回的识别结果数量，值越大返回的结果越多
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleProcess}
                    disabled={!selectedImage || processingState === 'segmenting' || processingState === 'predicting'}
                    className="flex-1 px-8 py-4 bg-gray-400 text-white rounded-lg text-base font-light hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {processingState === 'segmenting' || processingState === 'predicting' ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>
                          {processingState === 'segmenting' ? '分割中...' : '识别中...'}
                        </span>
                      </>
                    ) : (
                      '开始识别'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <ImageWithCrop
                    imageSrc={imagePreview}
                    onCropAreaChange={handleCropAreaChange}
                    cropArea={cropArea}
                  />
                  <button
                    onClick={handleReset}
                    disabled={processingState === 'segmenting' || processingState === 'predicting'}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white border border-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-20"
                  >
                    <svg
                      className="w-4 h-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 font-light">
                          检测框阈值
                        </label>
                        <span className="text-xs text-gray-500 font-light">
                          {boxThreshold.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={boxThreshold}
                        onChange={(e) => setBoxThreshold(parseFloat(e.target.value))}
                        disabled={processingState === 'segmenting' || processingState === 'predicting'}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: `linear-gradient(to right, #9ca3af 0%, #9ca3af ${(boxThreshold - 0.1) / 0.8 * 100}%, #e5e7eb ${(boxThreshold - 0.1) / 0.8 * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <p className="text-xs text-gray-400 font-light">
                        边界框置信度阈值：只有置信度 ≥ 此值的检测框才会被保留。调高更严格（可能漏检），调低更宽松（可能误检）
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 font-light">
                          文本识别阈值
                        </label>
                        <span className="text-xs text-gray-500 font-light">
                          {textThreshold.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={textThreshold}
                        onChange={(e) => setTextThreshold(parseFloat(e.target.value))}
                        disabled={processingState === 'segmenting' || processingState === 'predicting'}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: `linear-gradient(to right, #9ca3af 0%, #9ca3af ${(textThreshold - 0.1) / 0.8 * 100}%, #e5e7eb ${(textThreshold - 0.1) / 0.8 * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <p className="text-xs text-gray-400 font-light">
                        文本-图像匹配阈值：只有与提示词匹配分数 ≥ 此值的检测框才会被保留。调高更严格（只保留高度匹配），调低更宽松（可能包含匹配度较低的检测）
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 font-light">
                          返回结果数量
                        </label>
                        <span className="text-xs text-gray-500 font-light">
                          {topK}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={topK}
                        onChange={(e) => setTopK(parseInt(e.target.value))}
                        disabled={processingState === 'segmenting' || processingState === 'predicting'}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: `linear-gradient(to right, #9ca3af 0%, #9ca3af ${((topK - 1) / 9) * 100}%, #e5e7eb ${((topK - 1) / 9) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <p className="text-xs text-gray-400 font-light">
                        控制返回的识别结果数量，值越大返回的结果越多
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleProcess}
                      disabled={processingState === 'segmenting' || processingState === 'predicting'}
                      className="flex-1 px-8 py-4 bg-gray-400 text-white rounded-lg text-base font-light hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {processingState === 'segmenting' || processingState === 'predicting' ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>
                            {processingState === 'segmenting' ? '分割中...' : '识别中...'}
                          </span>
                        </>
                      ) : (
                        '开始识别'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col space-y-4">
            <div className="w-full border border-gray-200 rounded-lg bg-white p-6">
              <h2 className="text-sm font-light text-gray-700 mb-4">分割结果预览</h2>
              <SegmentResults results={segmentResults} />
            </div>
            <div className="w-full border border-gray-200 rounded-lg bg-white p-6">
              {imagePreview ? (
                <>
                  {processingState === 'segmenting' || processingState === 'predicting' ? (
                    <PredictionResultsSkeleton />
                  ) : predictionResults.length > 0 ? (
                    <PredictionResults 
                      results={predictionResults} 
                      croppedImageFile={croppedImageFile}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-gray-400 font-light">点击"开始识别"查看结果</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-gray-400 font-light">请先上传图片</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-16 pt-8 pb-8 border-t border-gray-200">
          <div className="flex flex-col items-center gap-4 text-sm text-gray-500 font-light">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span>Powered by </span>
              <a
                href="https://github.com/AetherSight/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800 transition-colors underline"
              >
                AetherSight
              </a>
              <span> with ♥</span>
            </div>
            <div className="text-center space-y-1">
              <p>FINAL FANTASY XIV © 2010-2026 SQUARE ENIX CO., LTD. All Rights Reserved.</p>
              <p>This project is not affiliated with or endorsed by SQUARE ENIX CO., LTD.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
