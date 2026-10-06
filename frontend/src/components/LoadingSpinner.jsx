export default function LoadingSpinner({ message = 'Đang tải...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
        <div className="absolute inset-2 w-10 h-10 rounded-full border-4 border-transparent border-t-green-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.7s' }} />
      </div>
      <p className="text-slate-400 text-sm font-medium">{message}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
      <div className="skeleton h-5 w-24 rounded-full" />
      <div className="flex justify-between items-center gap-4">
        <div className="skeleton h-7 flex-1 rounded-lg" />
        <div className="skeleton h-6 w-8 rounded" />
        <div className="skeleton h-7 flex-1 rounded-lg" />
      </div>
      <div className="space-y-2 pt-2 border-t border-slate-50">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
      </div>
      <div className="skeleton h-10 w-full rounded-xl" />
    </div>
  );
}
