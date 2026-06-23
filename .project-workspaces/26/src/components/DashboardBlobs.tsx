/**
 * Dashboard Header Blobs
 * 2 static blobs for dashboard header area
 * Specs: 256px, blue-400/pink-400, blur-3xl, 30% opacity, mix-blend-multiply
 */
export const DashboardBlobs = () => {
  return (
    <div className="absolute inset-0 opacity-30 overflow-hidden pointer-events-none">
      {/* Blue blob - left side */}
      <div 
        className="absolute top-0 left-0 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply"
        style={{ filter: 'blur(64px)' }}
      />
      {/* Pink blob - right side */}
      <div 
        className="absolute top-0 right-0 w-64 h-64 bg-pink-400 rounded-full mix-blend-multiply"
        style={{ filter: 'blur(64px)' }}
      />
    </div>
  );
};
