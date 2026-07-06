export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const THUMBNAIL_MAX_SIZE = 300;
const THUMBNAIL_QUALITY = 0.7;

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

export const validateFile = (file: File): string | null => {
  if (
    !file.type.startsWith("image/jpeg") &&
    !file.type.startsWith("image/png")
  ) {
    return "JPGまたはPNG形式の画像のみアップロード可能です。";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "ファイルサイズは1枚あたり5MB以下にしてください。";
  }
  return null;
};

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 履歴用サムネイル（長辺 300px の JPEG data URL）を生成する
export const resizeThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(
        THUMBNAIL_MAX_SIZE / Math.max(img.width, img.height),
        1
      );
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", THUMBNAIL_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("サムネイルの生成に失敗しました"));
    };
    img.src = objectUrl;
  });
};

// プレビュー用 Object URL を解放する（リストを空にする前に必ず呼ぶ）
export const revokeImagePreviews = (images: ImageFile[]) => {
  images.forEach((img) => URL.revokeObjectURL(img.preview));
};
