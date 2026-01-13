import React from 'react';
import { Twitter } from 'lucide-react';

export const Header: React.FC = () => {
    return (
        <header className="bg-white/80 backdrop-blur-sm border-b border-pop-cyan sticky top-0 z-50 shadow-sm">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-black p-2 rounded-lg shadow-[0_0_10px_#00ffff]">
                        <Twitter className="w-5 h-5 text-pop-cyan" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                        画像いっぱい投稿できるちくわﾁｬﾝﾃﾞｽ（偉い） <span className="text-sm font-normal text-pop-magenta ml-2">v2</span>
                    </h1>
                </div>
            </div>
        </header>
    );
};
