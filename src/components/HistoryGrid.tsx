import React from 'react';
import { Trash2, ExternalLink, Clock } from 'lucide-react';
import type { PostHistoryItem } from '../types';
import { formatTimestamp } from '../utils/postUtils';

interface HistoryGridProps {
    history: PostHistoryItem[];
    onDelete: (id: string) => void;
    onClear: () => void;
}

export const HistoryGrid: React.FC<HistoryGridProps> = ({ history, onDelete, onClear }) => {
    if (history.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>履歴はまだありません</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={onClear}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    履歴を全削除
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {history.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        {/* Thumbnail Header */}
                        <div className="bg-gray-100 aspect-video relative overflow-hidden">
                            {item.thumbnail ? (
                                <img src={item.thumbnail} alt="Post thumbnail" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                            )}
                            <div className="absolute top-2 right-2 flex gap-1">
                                {item.postUrl && (
                                    <a
                                        href={item.postUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                                <button
                                    onClick={() => onDelete(item.id)}
                                    className="bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3">
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(new Date(item.timestamp))}
                            </div>
                            <p className="text-sm text-gray-800 line-clamp-3 whitespace-pre-wrap font-sans">
                                {item.text}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
