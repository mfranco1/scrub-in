import React from "react";

interface ScheduleLegendItemProps {
  label: string;
  className: string;
}

function ScheduleLegendItem({ label, className }: ScheduleLegendItemProps) {
  return (
    <div className="flex items-center">
      <span className={`w-4 h-4 inline-block mr-1 ${className}`}></span>
      {label}
    </div>
  );
}

export function ScheduleLegend() {
  return (
    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-x-4 gap-y-2 text-xs">
      <ScheduleLegendItem 
        label="Pre-Duty" 
        className="bg-slate-200 border-l-[3px] border-slate-400" 
      />
      <ScheduleLegendItem 
        label="Duty" 
        className="bg-indigo-100 border-l-[3px] border-indigo-500" 
      />
      <ScheduleLegendItem 
        label="Post-Duty" 
        className="bg-red-100 border-l-[3px] border-red-500" 
      />
      
      <div className="border-l border-slate-300 h-4 mx-1"></div>
      
      <ScheduleLegendItem 
        label="Day Shift" 
        className="border-t-[3px] border-green-500" 
      />
      <ScheduleLegendItem 
        label="Evening Shift" 
        className="border-t-[3px] border-amber-500" 
      />
      <ScheduleLegendItem 
        label="Night Shift" 
        className="border-t-[3px] border-indigo-700" 
      />
    </div>
  );
}
