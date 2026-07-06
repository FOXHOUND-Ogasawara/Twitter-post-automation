import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock, History, Twitter } from 'lucide-react';
import type { PostGroup, PostHistoryItem, Tweet } from '../types';
import { getTimeline, toApiError } from '../services/api';

interface StatusMonitorProps {
    groups: PostGroup[];
    isPosting: boolean;
    currentGroupIndex: number;
    history: PostHistoryItem[];
}

interface DisplayItem {
    id: string;
    text: string;
    createdAt: string;
    url: string;
}

export const StatusMonitor: React.FC<StatusMonitorProps> = ({ groups, isPosting, currentGroupIndex, history }) => {
    // X API のタイムライン読み取りはレート制限が厳しいため自動取得はせず、
    // 通常はローカル履歴を表示して「更新」ボタン押下時のみ API を呼ぶ
    const [apiTweets, setApiTweets] = useState<Tweet[] | null>(null);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [timelineError, setTimelineError] = useState<string | null>(null);

    const fetchTimeline = async () => {
        setLoadingTimeline(true);
        setTimelineError(null);
        try {
            const tweets = await getTimeline();
            setApiTweets(tweets);
        } catch (error) {
            const apiError = toApiError(error, 'タイムラインの取得に失敗しました');
            console.warn('Timeline API failed, showing local history:', apiError);
            setApiTweets(null);
            setTimelineError(apiError.message);
        } finally {
            setLoadingTimeline(false);
        }
    };

    const isShowingHistory = !apiTweets || apiTweets.length === 0;

    const displayItems: DisplayItem[] = isShowingHistory
        ? history.slice(0, 5).map(h => ({
            id: h.id,
            text: h.text,
            createdAt: h.timestamp,
            url: h.postUrl
        }))
        : apiTweets.map(t => ({
            id: t.id,
            text: t.text,
            createdAt: t.createdAt,
            url: `https://x.com/i/web/status/${t.id}`
        }));

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
                                        <span className={`font-semibold ${index === currentGroupIndex && isPosting ? 'text-pop-cyan' : 'text-gray-700'}`}>
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

            {/* Bottom: Latest Posts (Local history by default, X API on demand) */}
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
                    <button onClick={fetchTimeline} disabled={loadingTimeline} className="text-xs text-blue-500 hover:text-blue-600 underline disabled:opacity-50">
                        Xから取得
                    </button>
                </div>

                {timelineError && (
                    <p className="text-xs text-pop-magenta">{timelineError}（ローカル履歴を表示しています）</p>
                )}

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
