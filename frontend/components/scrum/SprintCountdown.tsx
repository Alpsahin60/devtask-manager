'use client';

import { useEffect, useState } from 'react';
import { Sprint } from '@/types';

interface SprintCountdownProps {
  sprint: Sprint;
}

interface Breakdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

const breakdown = (endIso: string, nowMs: number): Breakdown => {
  const end = new Date(endIso).getTime();
  const diffMs = Math.max(0, end - nowMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalSeconds };
};

// Live countdown for active sprints. The interval is cleared on unmount and
// when the sprint changes, so no setInterval leaks accumulate when the user
// switches between sprints.
export const SprintCountdown = ({ sprint }: SprintCountdownProps) => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [sprint._id]);

  const time = breakdown(sprint.endDate, now);
  const isCritical = time.days <= 2;
  const isOver = time.totalSeconds === 0;

  const baseClasses =
    'rounded-xl border px-4 py-3 flex items-center justify-between gap-4';
  const toneClasses = isOver
    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300'
    : isCritical
      ? 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
      : 'border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';

  return (
    <div className={`${baseClasses} ${toneClasses}`} aria-live="polite">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Sprint-Countdown
        </p>
        <p className="text-sm">
          {isOver
            ? 'Sprint-Zeitfenster abgelaufen — bitte abschliessen oder verlaengern.'
            : `Endet am ${new Date(sprint.endDate).toLocaleDateString('de-CH')}`}
        </p>
      </div>
      <div className="font-mono text-sm sm:text-base tabular-nums">
        {time.days}
        <span className="opacity-60 ml-0.5 mr-2">d</span>
        {String(time.hours).padStart(2, '0')}
        <span className="opacity-60 mx-0.5">:</span>
        {String(time.minutes).padStart(2, '0')}
        <span className="opacity-60 mx-0.5">:</span>
        {String(time.seconds).padStart(2, '0')}
      </div>
    </div>
  );
};
