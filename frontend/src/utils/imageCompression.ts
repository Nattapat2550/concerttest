import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
 if (!file.type.startsWith('image/')) return file;
 
 const options = {
 maxSizeMB: 1, // Compress to max 1MB
 maxWidthOrHeight: 1920,
 useWebWorker: true,
 };
 
 try {
 const compressedFile = await imageCompression(file, options);
 return compressedFile;
 } catch (error) {
 console.error("Error compressing image:", error);
 return file; // fallback to original file if compression fails
 }
};
