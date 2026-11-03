import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
      {/* Animated icon */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <Leaf className="w-12 h-12 text-emerald-400 opacity-60" />
        </div>
        <span className="absolute -top-2 -right-2 text-4xl font-black text-slate-600">?</span>
      </div>

      {/* Error code */}
      <p className="text-8xl font-black text-slate-800 select-none mb-2">404</p>

      {/* Title */}
      <h1 className="text-2xl font-bold text-slate-200 mb-3">Page Not Found</h1>

      {/* Subtitle */}
      <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
        Looks like this page was recycled! The route you're looking for doesn't exist or
        may have been moved.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </div>
  );
}

export default NotFoundPage;
