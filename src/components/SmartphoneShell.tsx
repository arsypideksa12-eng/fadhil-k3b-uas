import React from 'react';
import { Wifi, BatteryFull, Signal } from 'lucide-react';
import { formatDateDDMMMYYYY } from '../utils/formatters';

interface SmartphoneShellProps {
  children: React.ReactNode;
  timeLabel?: string;
  darkTopBar?: boolean;
}

export const SmartphoneShell: React.FC<SmartphoneShellProps> = ({
  children,
  timeLabel,
  darkTopBar = true,
}) => {
  const now = new Date();
  const displayTime =
    timeLabel ??
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayFormatted = formatDateDDMMMYYYY(now);

  return (
    <div className="w-full flex justify-center items-center">
      {/* On real mobile (< 450px), edge-to-edge PWA. On >= 450px (desktop/preview panes), authentic smartphone frame on screen. */}
      <div className="w-full min-[450px]:w-[388px] min-[450px]:rounded-[54px] min-[450px]:bg-gradient-to-b min-[450px]:from-slate-600 min-[450px]:via-slate-900 min-[450px]:to-slate-800 min-[450px]:p-[10px] min-[450px]:shadow-[0_32px_90px_-18px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.14)] relative">
        {/* Realistic hardware side buttons */}
        <div className="hidden min-[450px]:block absolute -left-[3.5px] top-24 w-[3.5px] h-7 bg-slate-500 rounded-l-sm" />
        <div className="hidden min-[450px]:block absolute -left-[3.5px] top-36 w-[3.5px] h-11 bg-slate-500 rounded-l-sm" />
        <div className="hidden min-[450px]:block absolute -left-[3.5px] top-50 w-[3.5px] h-11 bg-slate-500 rounded-l-sm" />
        <div className="hidden min-[450px]:block absolute -right-[3.5px] top-40 w-[3.5px] h-16 bg-slate-500 rounded-r-sm" />

        {/* Inner Black Glass Frame */}
        <div className="w-full min-[450px]:rounded-[44px] min-[450px]:bg-black min-[450px]:p-[3px]">
          {/* Phone Screen — scales gracefully to fit laptop/preview viewports */}
          <div className="w-full min-h-screen min-[450px]:min-h-[580px] min-[450px]:h-[min(760px,calc(100dvh-88px))] min-[450px]:rounded-[41px] bg-[#F4F6F9] overflow-hidden flex flex-col relative">
            {/* Device Status Bar & Dynamic Island */}
            <div
              className={`hidden min-[450px]:flex items-center justify-between px-6 pt-3 pb-2 shrink-0 select-none ${
                darkTopBar ? 'bg-[#0B1220] text-white' : 'bg-white text-slate-900'
              }`}
            >
              <span className="font-mono-num text-[11px] font-semibold tracking-tight w-12">
                {displayTime}
              </span>

              {/* Dynamic Island with lens & speaker */}
              <div className="w-[100px] h-[23px] rounded-full bg-black flex items-center justify-between px-3 shadow-inner border border-slate-800/70">
                <span className="w-7 h-1 rounded-full bg-slate-800" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-indigo-400/70" />
                </span>
              </div>

              <div className="flex items-center justify-end gap-1.5 w-12 opacity-90">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <BatteryFull className="w-4 h-4" />
              </div>
            </div>

            <div className="sr-only">{todayFormatted}</div>

            {/* App Viewport Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">{children}</div>

            {/* Phone Home Indicator */}
            <div className="hidden min-[450px]:flex justify-center py-2 bg-white border-t border-slate-100 shrink-0">
              <div className="w-28 h-1 rounded-full bg-slate-900/25" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
