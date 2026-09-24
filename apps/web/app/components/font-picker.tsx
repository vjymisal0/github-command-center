'use client';

import { useEffect, useState } from 'react';

type FontChoice = 'clean' | 'portfolio' | 'technical';

export function FontPicker() {
  const [font, setFont] = useState<FontChoice>('clean');

  useEffect(() => {
    const saved = localStorage.getItem('font') as FontChoice | null;
    const initial = saved && ['clean', 'portfolio', 'technical'].includes(saved) ? saved : 'clean';
    setFont(initial);
    document.documentElement.dataset.font = initial;
  }, []);

  function change(value: FontChoice) {
    setFont(value);
    localStorage.setItem('font', value);
    document.documentElement.dataset.font = value;
  }

  return (
    <select className="font-picker" aria-label="Font combination" value={font} onChange={event => change(event.target.value as FontChoice)}>
      <option value="clean">Clean</option>
      <option value="portfolio">Portfolio</option>
      <option value="technical">Technical</option>
    </select>
  );
}
