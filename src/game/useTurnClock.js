import { useEffect, useMemo, useState } from 'react';

export default function useTurnClock(deadline, serverNow) {
  const [now, setNow] = useState(Date.now);
  const offset = useMemo(() => serverNow ? serverNow - Date.now() : 0, [serverNow]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  return Math.min(60, Math.max(0, Math.ceil(((deadline || now) - now - offset) / 1000)));
}
