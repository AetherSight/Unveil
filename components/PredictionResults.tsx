'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { PredictionResult, EquipmentDetail } from '@/lib/types';
import { sendFeedback, getEquipmentDetail } from '@/lib/api';

interface PredictionResultsProps {
  results: PredictionResult[];
  croppedImageFile: File | null;
  isSearchResult?: boolean; // 是否为搜索结果
}

export default function PredictionResults({ results, croppedImageFile, isSearchResult = false }: PredictionResultsProps) {
  const [selectedRank, setSelectedRank] = useState<number | string | null>(null);
  const [hoveredRank, setHoveredRank] = useState<number | null>(null);
  const [hoveredSameModelRank, setHoveredSameModelRank] = useState<number | null>(null); // hover同模装备提示的rank
  const [feedbackStatus, setFeedbackStatus] = useState<Record<number | string, 'sending' | 'success'>>({});
  const [popupRank, setPopupRank] = useState<number | null>(null); // 当前显示popup的装备rank
  const [failedAngles, setFailedAngles] = useState<Set<string>>(new Set()); // 记录加载失败的角度
  const [renderFiles, setRenderFiles] = useState<Array<{ fileName: string; angle: string }>>([]); // 渲染图文件列表
  const [loadedIcons, setLoadedIcons] = useState<Set<string>>(new Set());
  const [loadedRenders, setLoadedRenders] = useState<Set<string>>(new Set());
  const [equipmentDetail, setEquipmentDetail] = useState<EquipmentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  if (results.length === 0) {
    return null;
  }

  const UNKNOWN_RANK = 'unknown';

  const parseLabel = (label: string) => {
    const parts = label.split('_');
    if (parts.length >= 2) {
      const id = parts[parts.length - 1];
      const name = parts.slice(0, -1).join('_');
      return { name, id };
    }
    return { name: label, id: null };
  };

  const getWikiUrl = (name: string) => {
    const encodedName = encodeURIComponent(name);
    return `https://ff14.huijiwiki.com/wiki/物品:${encodedName}`;
  };

  const getIconUrl = (id: string | null) => {
    if (!id) return null;
    return `/icon/${id}`;
  };

  const getRenderUrl = (id: string, name: string, angle: string = 'h0') => {
    if (!id || !name) return null;
    const params = new URLSearchParams({ id, name, angle });
    return `/api/gear-render?${params.toString()}`;
  };

  useEffect(() => {
    if (popupRank !== null) {
      setFailedAngles(new Set());
      setLoadedRenders(new Set());
      setEquipmentDetail(null);
      const result = results.find(r => r.rank === popupRank);
      if (result) {
        const equipmentId = result.id || parseLabel(result.label).id;
        const { name } = parseLabel(result.label);
        if (equipmentId && name) {
          const params = new URLSearchParams({ id: equipmentId, name });
          fetch(`/api/gear-render-list?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
              if (data.files && Array.isArray(data.files)) {
                setRenderFiles(data.files);
              } else {
                setRenderFiles([]);
              }
            })
            .catch(err => {
              console.error('Failed to fetch render files:', err);
              setRenderFiles([]);
            });

          if (equipmentId && equipmentId.trim()) {
            setLoadingDetail(true);
            getEquipmentDetail(equipmentId)
              .then(detail => {
                setEquipmentDetail(detail);
                setLoadingDetail(false);
              })
              .catch(err => {
                console.error('Failed to fetch equipment detail:', err);
                setLoadingDetail(false);
              });
          }
        }
      }
    } else {
      setRenderFiles([]);
      setEquipmentDetail(null);
    }
  }, [popupRank, results]);

  const handleFeedback = async (label: string, rank: number | string) => {
    if (!croppedImageFile || selectedRank !== null) {
      return;
    }

    setSelectedRank(rank);
    setFeedbackStatus(prev => ({ ...prev, [rank]: 'sending' as const }));

    try {
      await sendFeedback(croppedImageFile, label);
      setFeedbackStatus(prev => ({ ...prev, [rank]: 'success' as const }));
    } catch (error) {
      setSelectedRank(null);
      setFeedbackStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[rank];
        return newStatus;
      });
    }
  };

  return (
    <div className="w-full">
      <div className={isSearchResult ? "grid grid-cols-2 gap-3" : "space-y-2"}>
        {results.map((result) => {
          const { name, id } = parseLabel(result.label);
          const iconUrl = getIconUrl(id);
          return (
            <div
              key={result.rank}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 border border-gray-200 rounded-lg bg-white"
            >
              <div className="flex items-center gap-3 min-w-0">
                {iconUrl ? (
                  <div 
                    className={`relative w-12 h-12 flex-shrink-0 ${
                      isSearchResult 
                        ? '' 
                        : !croppedImageFile
                          ? 'cursor-not-allowed opacity-50'
                          : selectedRank === null 
                            ? 'cursor-pointer' 
                            : selectedRank === result.rank 
                              ? 'cursor-default' 
                              : 'cursor-pointer'
                    }`}
                    onClick={!isSearchResult ? () => croppedImageFile && selectedRank === null && handleFeedback(result.label, result.rank) : undefined}
                    onMouseEnter={!isSearchResult ? () => croppedImageFile && selectedRank === null && setHoveredRank(result.rank) : undefined}
                    onMouseLeave={!isSearchResult ? () => setHoveredRank(null) : undefined}
                    title={
                      isSearchResult 
                        ? '' 
                        : !croppedImageFile 
                          ? '无可用图片' 
                          : selectedRank === null 
                            ? '点击反馈此结果' 
                            : selectedRank === result.rank 
                              ? '已选择' 
                              : ''
                    }
                  >
                    <Image
                      src={iconUrl}
                      alt={name}
                      fill
                      className="object-contain"
                      unoptimized
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    {!isSearchResult && (hoveredRank === result.rank && selectedRank === null && croppedImageFile) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded transition-opacity animate-fade-in">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {!isSearchResult && feedbackStatus[result.rank] === 'sending' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!isSearchResult && feedbackStatus[result.rank] === 'success' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-50/90 rounded transition-all animate-scale-in">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm font-light">
                    {result.rank}
                  </div>
                )}
                <div className={`flex flex-col ${isSearchResult ? 'flex-1 min-w-0' : ''}`}>
                  <button
                    onClick={() => {
                      // 总是显示popup，即使没有同模型装备
                      setPopupRank(result.rank);
                    }}
                    className={`text-gray-800 font-light hover:text-gray-600 transition-colors text-left ${isSearchResult ? 'truncate' : ''}`}
                    title={isSearchResult ? name : undefined}
                  >
                    {name}
                  </button>
                  {id && (
                    <div className="relative">
                      <span 
                        className="text-xs text-gray-400 font-light cursor-pointer hover:text-gray-600 transition-colors"
                        onMouseEnter={() => {
                          if (result.same_model_gears && result.same_model_gears.length > 0) {
                            setHoveredSameModelRank(result.rank);
                          }
                        }}
                        onMouseLeave={() => setHoveredSameModelRank(null)}
                      >
                        ID: {id}
                        {result.same_model_gears && result.same_model_gears.length > 0 && (
                          <> · {result.same_model_gears.length} 个同模装备</>
                        )}
                      </span>
                      {/* Hover popup for same model gears */}
                      {hoveredSameModelRank === result.rank && result.same_model_gears && result.same_model_gears.length > 0 && (
                        <div 
                          className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]"
                          onMouseEnter={() => setHoveredSameModelRank(result.rank)}
                          onMouseLeave={() => setHoveredSameModelRank(null)}
                        >
                          <div className="absolute -top-1 left-4 w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                          <div className="space-y-1">
                            {result.same_model_gears.map((gear) => {
                              const gearIconUrl = getIconUrl(gear.id);
                              const iconKey = gear.id || '';
                              const isLoading = gearIconUrl && !loadedIcons.has(iconKey);
                              return (
                                <div
                                  key={gear.id}
                                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // 找到对应的result并打开popup
                                    const targetResult = results.find(r => {
                                      const { id: rId } = parseLabel(r.label);
                                      return rId === gear.id;
                                    });
                                    if (targetResult) {
                                      setPopupRank(targetResult.rank);
                                      setHoveredSameModelRank(null);
                                    }
                                  }}
                                >
                                  {gearIconUrl ? (
                                    <div className="relative w-8 h-8 flex-shrink-0">
                                      {isLoading && (
                                        <div className="absolute inset-0 bg-gray-200 rounded animate-pulse" />
                                      )}
                                      <Image
                                        src={gearIconUrl}
                                        alt={gear.name}
                                        fill
                                        className="object-contain"
                                        unoptimized
                                        onLoad={() => {
                                          setLoadedIcons(prev => new Set(prev).add(iconKey));
                                        }}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          setLoadedIcons(prev => new Set(prev).add(iconKey));
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-xs font-light">
                                      ?
                                    </div>
                                  )}
                                  <span className="text-sm text-gray-700 font-light">{gear.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {!isSearchResult && (
                <div className="flex items-center gap-2 w-full sm:w-[160px] justify-between mt-1 sm:mt-0">
                  <div className="w-full sm:w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 transition-all"
                      style={{ width: `${result.score * 100}%` }}
                    />
                  </div>
                  <span className="ml-1 text-xs text-gray-500 w-11 text-right font-light flex-shrink-0">
                    {(result.score * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {!isSearchResult && (
          <div
            key={UNKNOWN_RANK}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 border border-gray-200 rounded-lg bg-white"
          >
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className={`relative w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded transition-opacity ${
                !croppedImageFile
                  ? 'cursor-not-allowed opacity-50'
                  : selectedRank === null 
                    ? 'cursor-pointer hover:opacity-70' 
                    : selectedRank === UNKNOWN_RANK 
                      ? 'cursor-default' 
                      : 'cursor-pointer'
              }`}
              onClick={() => croppedImageFile && selectedRank === null && handleFeedback('unknown', UNKNOWN_RANK)}
              title={
                !croppedImageFile 
                  ? '无可用图片' 
                  : selectedRank === null 
                    ? '点击反馈此结果' 
                    : selectedRank === UNKNOWN_RANK 
                      ? '已选择' 
                      : ''
              }
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {feedbackStatus[UNKNOWN_RANK] === 'sending' && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {feedbackStatus[UNKNOWN_RANK] === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-50/90 rounded transition-all animate-scale-in">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-gray-800 font-light">
                没有正确结果？点此反馈
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-[160px] justify-between mt-1 sm:mt-0">
            <div className="w-full sm:w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 transition-all"
                style={{ width: '0%' }}
              />
            </div>
            <span className="ml-1 text-xs text-gray-500 w-11 text-right font-light flex-shrink-0">
              0.00%
            </span>
          </div>
        </div>
        )}
      </div>

      {/* 同模型装备 Popup */}
      {popupRank !== null && (() => {
        const result = results.find(r => r.rank === popupRank);
        if (!result) {
          return null;
        }
        const equipmentId = result.id || parseLabel(result.label).id;
        const { name: currentName } = parseLabel(result.label);
        const currentId = equipmentId;
        const currentIconUrl = getIconUrl(currentId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPopupRank(null)}>
            <div 
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-light text-gray-800">同模型装备</h3>
                <button
                  onClick={() => setPopupRank(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="关闭"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 当前装备 */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="space-y-3">
                  {/* 渲染图 - 从目录读取前3个文件 */}
                  {currentId && (
                    <div className="flex justify-center gap-2">
                      {renderFiles.length > 0 ? (
                        renderFiles.map((file) => {
                          const imageKey = `${currentId}-${file.angle}`;
                          const hasFailed = failedAngles.has(imageKey);
                          const isLoading = !hasFailed && !loadedRenders.has(imageKey);
                          return (
                            <div key={file.fileName} className="relative w-32 h-32 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                              {hasFailed ? (
                                <span className="text-xs text-gray-400 font-light">文件不存在</span>
                              ) : (
                                <>
                                  {isLoading && (
                                    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                                  )}
                                <Image
                                  src={getRenderUrl(currentId, currentName, file.angle) || ''}
                                  alt={`${currentName} 渲染图 ${file.angle}`}
                                  fill
                                  className="object-contain"
                                  unoptimized
                                    onLoad={() => {
                                      setLoadedRenders(prev => new Set(prev).add(imageKey));
                                    }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    setFailedAngles(prev => new Set(prev).add(imageKey));
                                      setLoadedRenders(prev => new Set(prev).add(imageKey));
                                  }}
                                />
                                </>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        // 加载中骨架图
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3].map((index) => (
                            <div key={index} className="relative w-32 h-32 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* 装备信息 */}
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    {currentIconUrl ? (
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <Image
                          src={currentIconUrl}
                          alt={currentName}
                          fill
                          className="object-contain"
                          unoptimized
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 text-gray-500 text-sm font-light">
                        {result.rank}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-gray-800 font-light">{currentName}</div>
                      {currentId && (
                        <span className="text-xs text-gray-400 font-light">ID: {currentId}</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        window.open(getWikiUrl(currentName), '_blank', 'noopener,noreferrer');
                      }}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="查看 Wiki"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Equipment Details */}
                  {loadingDetail && (
                    <div className="text-xs text-gray-400 font-light">Loading details...</div>
                  )}
                  {equipmentDetail && !loadingDetail && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      {equipmentDetail.appearance_description && (
                        <div>
                          <div className="text-xs text-gray-500 font-light mb-1">Description</div>
                          <div className="text-xs text-gray-700 font-light leading-relaxed">
                            {equipmentDetail.appearance_description}
                          </div>
                        </div>
                      )}
                      
                      {equipmentDetail.colors && equipmentDetail.colors.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-light mb-1">Colors</div>
                          <div className="flex flex-wrap gap-1">
                            {equipmentDetail.colors.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-light rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {equipmentDetail.materials && equipmentDetail.materials.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-light mb-1">Materials</div>
                          <div className="flex flex-wrap gap-1">
                            {equipmentDetail.materials.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-light rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {equipmentDetail.shapes && equipmentDetail.shapes.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-light mb-1">Shapes</div>
                          <div className="flex flex-wrap gap-1">
                            {equipmentDetail.shapes.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-light rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {equipmentDetail.decorations && equipmentDetail.decorations.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-light mb-1">Decorations</div>
                          <div className="flex flex-wrap gap-1">
                            {equipmentDetail.decorations.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-light rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {equipmentDetail.styles && equipmentDetail.styles.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-light mb-1">Styles</div>
                          <div className="flex flex-wrap gap-1">
                            {equipmentDetail.styles.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-light rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {equipmentDetail.custom_tags && equipmentDetail.custom_tags.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-light mb-1">Custom Tags</div>
                          <div className="flex flex-wrap gap-1">
                            {equipmentDetail.custom_tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-light rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {equipmentDetail.appearance_looks_like && equipmentDetail.appearance_looks_like.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-light mb-1">Looks Like</div>
                          <div className="flex flex-wrap gap-1">
                            {equipmentDetail.appearance_looks_like.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-light rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 同模型装备列表 */}
              {result.same_model_gears && result.same_model_gears.length > 0 && (
                <div className="space-y-2">
                  {result.same_model_gears.map((gear) => {
                  const gearIconUrl = getIconUrl(gear.id);
                  const iconKey = gear.id || '';
                  const isLoading = gearIconUrl && !loadedIcons.has(iconKey);
                  return (
                    <div
                      key={gear.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {gearIconUrl ? (
                        <div className="relative w-12 h-12 flex-shrink-0">
                          {isLoading && (
                            <div className="absolute inset-0 bg-gray-200 rounded animate-pulse" />
                          )}
                          <Image
                            src={gearIconUrl}
                            alt={gear.name}
                            fill
                            className="object-contain"
                            unoptimized
                            onLoad={() => {
                              setLoadedIcons(prev => new Set(prev).add(iconKey));
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              setLoadedIcons(prev => new Set(prev).add(iconKey));
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 text-gray-500 text-sm font-light">
                          ?
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-gray-800 font-light">{gear.name}</div>
                        <span className="text-xs text-gray-400 font-light">ID: {gear.id}</span>
                      </div>
                      <button
                        onClick={() => {
                          window.open(getWikiUrl(gear.name), '_blank', 'noopener,noreferrer');
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="查看 Wiki"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

