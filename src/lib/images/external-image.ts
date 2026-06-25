/** Google CDN blocks Next.js image optimizer fetches (403/400). */
export function shouldUseUnoptimizedImage(src: string): boolean {
  return src.includes('googleusercontent.com');
}
