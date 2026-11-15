'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload, Check, AlertCircle } from 'lucide-react';
import { uploadApi } from '@/lib/api/upload.api';
import toast from 'react-hot-toast';

interface NidZoneProps {
  label: string;
  labelBn: string;
  context: 'nid_front' | 'nid_back';
  onUploaded: (objectKey: string) => void;
}

function NidCaptureZone({ label, labelBn, context, onUploaded }: NidZoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream helper
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Camera start
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch {
      toast.error('ক্যামেরা চালু করা সম্ভব হয়নি। ফাইল আপলোড অপশন ব্যবহার করুন।');
    }
  };

  // Upload direct to S3
  const uploadBinary = async (file: Blob, mimeType: string) => {
    try {
      setIsUploading(true);
      // 1. Get Presigned PUT URL
      const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg';
      const presignedRes = await uploadApi.getPresignedUrl({
        context,
        fileName: `${context}_${Date.now()}${ext}`,
        fileType: mimeType,
        fileSize: file.size,
      });

      const { uploadUrl, objectKey } = presignedRes.data.data;

      // 2. Direct PUT to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      });

      // 3. Confirm upload
      await uploadApi.confirmUpload(objectKey, context);

      onUploaded(objectKey);
      toast.success(`${label} আপলোড সম্পন্ন!`);
    } catch {
      toast.error(`${label} আপলোড ব্যর্থ হয়েছে`);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Capture frame from active camera
  const captureFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stopCamera();
        uploadBinary(blob, 'image/jpeg');
      }
    }, 'image/jpeg', 0.9);
  };

  // Compress NID photos taken with high-res phone cameras
  const compressNidImage = (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle local file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('দয়া করে ছবি ফাইল নির্বাচন করুন (JPEG/PNG/WebP)');
      return;
    }

    const compressed = await compressNidImage(file);
    const url = URL.createObjectURL(compressed);
    setPreviewUrl(url);
    uploadBinary(compressed, 'image/jpeg');
  };

  return (
    <div className="flex-1 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
      {/* Live Video View */}
      {isCameraActive ? (
        <div className="relative w-full h-full min-h-[200px] flex flex-col items-center justify-center">
          <video ref={videoRef} className="w-full h-44 object-cover rounded-xl" autoPlay playsInline />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={captureFrame}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
            >
              ছবি তুলুন (Snap)
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : previewUrl ? (
        /* Image Preview View */
        <div className="relative w-full flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={label} className="w-full h-36 object-contain rounded-xl bg-slate-50" />
          <div className="mt-2 flex items-center justify-between w-full px-2">
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{labelBn} যুক্ত হয়েছে</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setPreviewUrl(null);
              }}
              className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retake</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty Capture / Upload Prompt */
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-800">{label}</h5>
            <p className="text-[11px] text-slate-400">{labelBn}</p>
          </div>
          <div className="flex gap-2 justify-center pt-1">
            <button
              type="button"
              onClick={startCamera}
              disabled={isUploading}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-slate-800 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-600 mt-2">Uploading to S3...</span>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
    </div>
  );
}

interface NidCaptureProps {
  onBothUploaded: (frontKey: string, backKey: string) => void;
}

export function NidCapture({ onBothUploaded }: NidCaptureProps) {
  const [frontKey, setFrontKey] = useState<string | null>(null);
  const [backKey, setBackKey] = useState<string | null>(null);

  const handleFrontDone = (key: string) => {
    setFrontKey(key);
    if (backKey) onBothUploaded(key, backKey);
  };

  const handleBackDone = (key: string) => {
    setBackKey(key);
    if (frontKey) onBothUploaded(frontKey, key);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NidCaptureZone
          label="NID Front"
          labelBn="সামনের দিক"
          context="nid_front"
          onUploaded={handleFrontDone}
        />
        <NidCaptureZone
          label="NID Back"
          labelBn="পিছনের দিক"
          context="nid_back"
          onUploaded={handleBackDone}
        />
      </div>

      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
        <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
        <span>💡 পরিষ্কার আলোতে ছবি তুলুন যাতে NID নম্বর ও ছবি স্পষ্ট বোঝা যায়।</span>
      </div>
    </div>
  );
}

