'use client';
import { useState } from 'react';

export function useNavigationHistory(initial: string | null = null) {
  const [stack, setStack] = useState<string[]>(initial ? [initial] : []);

  const current = stack.length > 0 ? stack[stack.length - 1] : null;

  const navigate = (id: string) => setStack(prev => [...prev, id]);

  const goBack = () => setStack(prev => prev.slice(0, -1));

  const goHome = () => setStack([]);

  const canGoBack = stack.length > 0;

  return { current, navigate, goBack, goHome, canGoBack };
}
