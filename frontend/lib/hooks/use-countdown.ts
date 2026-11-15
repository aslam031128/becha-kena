'use client';

import { useState, useEffect } from 'react';

export function useCountdown(targetDate: string | Date | null) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
    isExpired: boolean;
  }>({
    hours: '00',
    minutes: '00',
    seconds: '00',
    isExpired: false,
  });

  useEffect(() => {
    if (!targetDate) return;

    const targetTime = new Date(targetDate).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({
          hours: '00',
          minutes: '00',
          seconds: '00',
          isExpired: true,
        });
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0'),
        isExpired: false,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

