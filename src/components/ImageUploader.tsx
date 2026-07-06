import React, { useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { validateFile, revokeImagePreviews } from '../utils/imageUtils';
import type { ImageFile } from '../utils/imageUtils';
import { IMAGES_PER_GROUP } from '../constants';

interface ImageUploaderProps {
    images: ImageFile[];
    setImages: React.Dispatch<React.SetStateAction<ImageFile[]>>;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ images, setImages }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;

        const newImages: ImageFile[] = [];
        Array.from(files).forEach((file) => {
            const error = validateFile(file);
            if (error) {
                alert(error); // Simple alert for now, could be toast
                return;
            }
            newImages.push({
                id: crypto.randomUUID(),
                file,
                preview: URL.createObjectURL(file),
            });
        });

        setImages((prev) => [...prev, ...newImages]);
    }, [setImages]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const removeImage = (id: string) => {
        setImages((prev) => {
            const target = prev.find((img) => img.id === id);
            if (target) {
                URL.revokeObjectURL(target.preview);
            }
            return prev.filter((img) => img.id !== id);
        });
    };

    const clearAll = () => {
        revokeImagePreviews(images);
        setImages([]);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    画像アップロード
                </h2>
                {images.length > 0 && (
                    <button
                        onClick={clearAll}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                        全削除
                    </button>
                )}
            </div>

            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-pop-cyan hover:bg-pop-cyan/5 transition-all group hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]"
            >
                <div className="bg-gray-100 p-4 rounded-full mb-4 group-hover:bg-pop-cyan/20 transition-colors">
                    <Upload className="w-8 h-8 text-gray-500 group-hover:text-pop-cyan" />
                </div>
                <p className="text-gray-600 font-medium mb-1">
                    ドラッグ＆ドロップ または クリックして選択
                </p>
                <p className="text-sm text-gray-400">
                    JPG, PNG (最大5MB)
                </p>
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg, image/png"
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                        <div key={image.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                            <img
                                src={image.preview}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => removeImage(image.id)}
                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {images.length > 0 && (
                <div className="text-right text-sm text-gray-500">
                    合計: {images.length}枚 ({Math.ceil(images.length / IMAGES_PER_GROUP)} グループ)
                </div>
            )}
        </div>
    );
};
