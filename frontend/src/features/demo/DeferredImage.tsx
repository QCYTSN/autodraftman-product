import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';

// Native lazy loading can fetch several screens ahead. Reserve the dimensions
// but request large comparison originals only near their actual viewport.
export function DeferredImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const image = useRef<HTMLImageElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!image.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(image.current);
    return () => observer.disconnect();
  }, []);
  return <img {...props} ref={image} src={near ? src : undefined} decoding="async" />;
}
