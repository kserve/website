import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';

const sections = [
  { id: 'why-kserve', label: 'Why KServe' },
  { id: 'api', label: 'API' },
  { id: 'architecture', label: 'How It Works' },
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'adopters', label: 'Adopters' },
];

export default function HomepageSectionNav() {
  const [activeId, setActiveId] = useState<string>('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    // Show nav after scrolling past hero
    const heroObserver = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 }
    );

    const hero = document.querySelector('.hero');
    if (hero) heroObserver.observe(hero);

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      heroObserver.disconnect();
    };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navbarHeight = (document.querySelector('.navbar') as HTMLElement)?.offsetHeight ?? 60;
    const sectionNavHeight = (document.querySelector('nav[class*="sectionNav"]') as HTMLElement)?.offsetHeight ?? 44;
    const offset = navbarHeight + sectionNavHeight + 16;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <nav className={`${styles.sectionNav} ${visible ? styles.visible : ''}`}>
      <div className={styles.navInner}>
        {sections.map(({ id, label }) => (
          <button
            key={id}
            className={`${styles.navItem} ${activeId === id ? styles.active : ''}`}
            onClick={() => scrollTo(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
