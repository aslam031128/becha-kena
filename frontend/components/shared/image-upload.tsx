'use client';

import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadApi } from '@/lib/api/upload.api';
import { resolveMediaUrl } from '@/lib/utils/media';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  maxImages?: number;
  uploadedImages: string[];
  onChange: (images: string[]) => void;
}

export function ImageUpload({
  maxImages = 8,
  uploadedImages,
  onChange,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > maxImages) {
      toast.error(`সর্বোচ্চ ${maxImages} টি ছবি যুক্ত করতে পারবেন`);
      return;
    }

    setIsUploading(true);
    const newImageKeys: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} এর সাইজ ৫MB এর বেশি`);
        continue;
      }

      // Validate MIME type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name} সঠিক ফরম্যাট নয় (JPEG/PNG/WebP অনুমোদিত)`);
        continue;
      }

      try {
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        // 1. Get Presigned S3 PUT URL
        const presignedRes = await uploadApi.getPresignedUrl({
          context: 'listing_image',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });

        const { uploadUrl, objectKey } = presignedRes.data.data;

        // 2. Direct PUT to S3
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        // 3. Confirm upload
        const confirmRes = await uploadApi.confirmUpload(objectKey, 'listing_image');
        newImageKeys.push(confirmRes.data.data.publicUrl || objectKey);
      } catch {
        toast.error(`${file.name} আপলোড ব্যর্থ হয়েছে`);
      }
    }

    onChange([...uploadedImages, ...newImageKeys]);
    setIsUploading(false);
    setUploadProgress(null);
  };

  const handleRemove = (index: number) => {
    const updated = uploadedImages.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Thumbnails preview */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {uploadedImages.map((url, idx) => (
            <div
              key={idx}
              className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveMediaUrl(url)} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/70 hover:bg-red-600 text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      {uploadedImages.length < maxImages && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center min-h-[140px]"
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-slate-700">
                আপলোড হচ্ছে... {uploadProgress ? `${uploadProgress}%` : ''}
              </span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                ছবি নির্বাচন করতে ক্লিক বা ড্র্যাগ করুন
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                সর্বোচ্চ {maxImages} টি ছবি (ম্যাক্স ৫MB প্রতিটি, প্রথম ছবি থাম্বনেইল হবে)
              </p>
            </>
          )}

          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

