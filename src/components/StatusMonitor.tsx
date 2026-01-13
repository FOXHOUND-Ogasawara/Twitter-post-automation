import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock, History, Twitter } from 'lucide-react';
import type { PostHistoryItem } from './HistoryGrid';
import { getTimeline, type Tweet } from '../services/api';

export interface PostGroup {
    id: string;
    images: string[]; // Grouped image IDs
    status: 'pending' | 'posting' | 'success' | 'failed';
    error?: string;
    retryCount: number;
}

interface StatusMonitorProps {
    groups: PostGroup[];
    isPosting: boolean;
    currentGroupIndex: number;
    history: PostHistoryItem[]; // Receive history from App
}

export const StatusMonitor: React.FC<StatusMonitorProps> = ({ groups, isPosting, currentGroupIndex: _currentGroupIndex, history }) => {
    // API Timeline State
    const [apiTweets, setApiTweets] = useState<Tweet[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [useFallback, setUseFallback] = useState(false);

    const fetchTimeline = async () => {
        setLoadingTimeline(true);
        setUseFallback(false);
        try {
            const tweets = await getTimeline();
            if (tweets && tweets.length > 0) {
                setApiTweets(tweets);
                setUseFallback(false);
            } else {
                // Empty result might mean no tweets or filter issue, fallback just in case or show empty
                // Ideally if API succeeds but returns 0, we trust it. But for "Smart Fallback" let's check.
                if (tweets.length === 0) {
                    // Empty is valid, but if user wants "Latest Activity" maybe History is better if API is empty?
                    // Let's stick to: Success = API, Error = Fallback.
                }
                setApiTweets(tweets);
            }
        } catch (error) {
            console.warn("Timeline API failed, falling back to history:", error);
            setUseFallback(true);
        } finally {
            setLoadingTimeline(false);
        }
    };

    useEffect(() => {
        fetchTimeline();
    }, [isPosting]);

    // Decide what to show
    // If loading -> Show loader
    // If not loading and useFallback -> Show History (latest 5)
    // If not loading and not fallback -> Show API Tweets (latest 5)

    // Note: getTimeline wrapper in services/api returns [] on error. 
    // We need to modify getTimeline logic or just check if it returns empty and specific error state?
    // Actually, current services/api.ts catches error and returns []. 
    // So 'useFallback' won't be triggered by catch block unless getTimeline throws.
    // The previous implementation of getTimeline returned [] on error. 
    // Let's update StatusMonitor to treat [] as potential fallback if needed? 
    // Or better: Let's assume if [] counts as valid. But since user has 429, we WANT fallback.
    // I should probably switch services/api.ts to THROW on error so we can detect it here.
    // OR, I can just blindly mix them? No, duplicates.

    // Let's check api.ts again. It catches and returns [].
    // I should modify StatusMonitor to fallback if apiTweets is empty? 
    // Or better, let's just show history if apiTweets is empty?
    // User requested "If I use endpoint it should work", implies meaningful data.
    // Let's rely on apiTweets. If empty, maybe fallback to history?
    // For now, let's try to update logic:
    // 1. Call fetchTimeline.
    // 2. If length 0, assume failed/empty and show history?
    // That's a safe bet for "Smart".

    const displayItems = (useFallback || apiTweets.length === 0)
        ? history.slice(0, 5).map(h => ({
            id: h.id,
            text: h.text,
            createdAt: h.timestamp,
            source: 'history',
            url: h.postUrl
        }))
        : apiTweets.map(t => ({
            id: t.id,
            text: t.text,
            createdAt: t.createdAt,
            source: 'api',
            url: `https://twitter.com/i/web/status/${t.id}`
        }));

    const isShowingHistory = useFallback || apiTweets.length === 0;

    const successCount = groups.filter(g => g.status === 'success').length;
    const progress = Math.round((successCount / Math.max(groups.length, 1)) * 100);

    return (
        <div className="flex flex-col space-y-6">
            {/* Top: Progress Status */}
            <div className="space-y-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-pop-cyan shadow-lg">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Loader2 className={`w-5 h-5 ${isPosting ? 'animate-spin text-pop-magenta' : 'text-gray-400'}`} />
                    投稿ステータス
                </h3>

                {groups.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        待機中...
                    </div>
                ) : (
                    <>
                        <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-pop-cyan h-full transition-all duration-500 shadow-[0_0_10px_#00ffff]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div className="flex justify-between text-sm font-medium text-gray-600">
                            <span>進行状況: {successCount} / {groups.length} グループ完了</span>
                            <span>{progress}%</span>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {groups.map((group, index) => (
                                <div
                                    key={group.id}
                                    className={`p-3 rounded-lg border text-sm flex items-center justify-between transition-colors ${group.status === 'posting' ? 'bg-pop-cyan/10 border-pop-cyan' :
                                        group.status === 'success' ? 'bg-pop-lime/10 border-pop-lime' :
                                            group.status === 'failed' ? 'bg-pop-magenta/10 border-pop-magenta' :
                                                'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`font-semibold ${index === _currentGroupIndex && isPosting ? 'text-pop-cyan' : 'text-gray-700'}`}>
                                            グループ {index + 1}
                                        </span>
                                        <span className="text-gray-500 text-xs">({group.images.length}枚)</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {group.status === 'posting' && <span className="text-pop-cyan animate-pulse">投稿中...</span>}
                                        {group.status === 'success' && <span className="text-green-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" />成功</span>}
                                        {group.status === 'failed' && <span className="text-pop-magenta flex items-center"><AlertCircle className="w-4 h-4 mr-1" />失敗</span>}
                                        {group.status === 'pending' && <span className="text-gray-400">待機中</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Bottom: Latest Tweets (Hybrid) */}
            <div className="space-y-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-pop-magenta shadow-lg h-fit">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        {isShowingHistory ? (
                            <History className="w-5 h-5 text-gray-500" />
                        ) : (
                            <Twitter className="w-5 h-5 text-blue-400" />
                        )}
                        最新の投稿 {isShowingHistory ? '(履歴)' : '(X)'}
                    </h3>
                    <button onClick={fetchTimeline} disabled={loadingTimeline} className="text-xs text-blue-500 hover:text-blue-600 underline">
                        更新
                    </button>
                </div>

                {loadingTimeline ? (
                    <div className="p-4 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        読み込み中...
                    </div>
                ) : displayItems.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                        投稿がありません
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayItems.map((item) => (
                            <div key={item.id} className="p-3 bg-white/60 rounded border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-sm text-gray-800 break-words whitespace-pre-wrap line-clamp-3">{item.text}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                                        Twitterで見る
                                    </a>
                                    <span className="text-xs text-gray-400 block text-right">
                                        {new Date(item.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
