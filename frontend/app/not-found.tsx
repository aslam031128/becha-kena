import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl font-extrabold mb-6 shadow-sm border border-emerald-100">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
        Page Not Found
      </h1>
      <p className="text-slate-600 max-w-md mb-8 text-sm sm:text-base">
        পৃষ্ঠাটি খুঁজে পাওয়া যায়নি। আপনি যে পৃষ্ঠাটি খুঁজছেন তা মুছে ফেলা হয়েছে অথবা ঠিকানাটি ভুল।
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors shadow-sm"
      >
        Go Home (হোমে ফিরে যান)
      </Link>
    </div>
  );
}

