import React from 'react';
import { Edit3 } from 'lucide-react';
import { MAX_TWEET_CHARS } from '../constants';
import { formatTimestamp, getPostBodyLength } from '../utils/postUtils';

interface PostComposerProps {
    text: string;
    setText: (text: string) => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({ text, setText }) => {
    // 投稿時に自動付加されるタイムスタンプ分を含めた実効文字数でカウントする
    const effectiveLength = getPostBodyLength(text);
    const remaining = MAX_TWEET_CHARS - effectiveLength;

    // Current time for preview context
    const currentTime = formatTimestamp(new Date());

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Edit3 className="w-5 h-5" />
                    投稿本文
                </h2>
                <div className={`text-sm font-medium ${remaining < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    残り文字数: {remaining} / {MAX_TWEET_CHARS}（タイムスタンプ含む）
                </div>
            </div>

            <div className="relative">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full h-48 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pop-magenta focus:border-transparent resize-none font-sans text-base transition-shadow shadow-sm"
                    placeholder={`2025.11.15\n@ アメリカ村DROP\n\nちくわﾁｬﾝﾃﾞｽ(@husky_chikuwa)\n#ちくわﾁｬﾝﾃﾞｽ #husky (@husky_idol) #はすきーちゃん`}
                />
            </div>

            {/* Preview Area */}
            <div className="bg-white/50 border border-gray-200 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    プレビュー
                </div>
                <div className="p-4">
                    <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                        {text || <span className="text-gray-400 italic">本文が入力されていません</span>}
                        <div className="mt-4 text-pop-magenta font-medium bg-pop-magenta/10 inline-block px-2 py-1 rounded border border-pop-magenta/20">
                            {currentTime} <span className="text-xs opacity-75">（投稿時に自動追加）</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
