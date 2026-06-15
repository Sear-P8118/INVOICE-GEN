'use client';

import { useEffect, useState } from 'react';
import { isBirthdayWindow } from '@/lib/birthday';
import BirthdayScreen from './BirthdayScreen';

// Shows the birthday screen once per login during the Perth 15–16 June window.
// Uses sessionStorage (cleared on each fresh login) so it never persists across
// years and reappears on re-login, but not while moving between pages.
const KEY = 'bdayShown';

export default function BirthdayGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (isBirthdayWindow() && sessionStorage.getItem(KEY) !== '1') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShow(true);
      }
    } catch {
      /* if anything fails, simply don't show — never block the app */
    }
  }, []);

  function dismiss() {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;
  return <BirthdayScreen onContinue={dismiss} />;
}
