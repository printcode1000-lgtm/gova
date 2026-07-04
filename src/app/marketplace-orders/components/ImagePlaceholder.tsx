'use client';

import React from 'react';
import { User, Map, Package, Image, Shield, AlertTriangle, Headphones } from 'lucide-react';

interface ImagePlaceholderProps {
  alt?: string;
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function ImagePlaceholder({ alt = '', className = '', width, height }: ImagePlaceholderProps) {
  const lowerAlt = alt.toLowerCase();
  
  // Choose icon based on alt text to make it expressive (معبر)
  let Icon = Image;
  let label = 'صورة';
  
  if (
    lowerAlt.includes('avatar') || 
    lowerAlt.includes('headshot') || 
    lowerAlt.includes('user') || 
    lowerAlt.includes('profile') || 
    lowerAlt.includes('entrepreneur') || 
    lowerAlt.includes('person') || 
    lowerAlt.includes('seller') || 
    lowerAlt.includes('buyer') || 
    lowerAlt.includes('carrier')
  ) {
    Icon = User;
    label = 'صورة شخصية';
  } else if (
    lowerAlt.includes('map') || 
    lowerAlt.includes('location') || 
    lowerAlt.includes('tracking') || 
    lowerAlt.includes('route') || 
    lowerAlt.includes('distance') || 
    lowerAlt.includes('sorting') || 
    lowerAlt.includes('hub')
  ) {
    Icon = Map;
    label = 'خريطة التتبع';
  } else if (
    lowerAlt.includes('product') || 
    lowerAlt.includes('turbine') || 
    lowerAlt.includes('gear') || 
    lowerAlt.includes('assembly') || 
    lowerAlt.includes('item') || 
    lowerAlt.includes('machinery') || 
    lowerAlt.includes('fiber') || 
    lowerAlt.includes('material') || 
    lowerAlt.includes('package') || 
    lowerAlt.includes('shipment') || 
    lowerAlt.includes('box')
  ) {
    Icon = Package;
    label = 'صورة المنتج / الشحنة';
  } else if (
    lowerAlt.includes('shield') || 
    lowerAlt.includes('verified') || 
    lowerAlt.includes('security') || 
    lowerAlt.includes('trust') || 
    lowerAlt.includes('badge')
  ) {
    Icon = Shield;
    label = 'شعار توثيق / حماية';
  } else if (
    lowerAlt.includes('warning') || 
    lowerAlt.includes('alert') || 
    lowerAlt.includes('error') || 
    lowerAlt.includes('dispute') || 
    lowerAlt.includes('danger')
  ) {
    Icon = AlertTriangle;
    label = 'تنبيه / خلاف';
  } else if (
    lowerAlt.includes('support') || 
    lowerAlt.includes('agent') || 
    lowerAlt.includes('contact') || 
    lowerAlt.includes('help')
  ) {
    Icon = Headphones;
    label = 'الدعم الفني';
  }
  
  return (
    <div 
      className={`bg-surface-container-high text-on-surface-variant flex flex-col items-center justify-center p-3 rounded-lg border border-outline-variant/30 select-none ${className}`}
      style={{ 
        width: width || '100%', 
        height: height || '100%', 
        minHeight: height ? undefined : '120px' 
      }}
      title={alt}
    >
      <Icon className="w-8 h-8 opacity-60 mb-2 shrink-0" />
      <span className="text-xs text-center font-medium opacity-80 line-clamp-2 px-1" dir="rtl">
        {label}
        {alt ? ` (${alt.split('.')[0].substring(0, 30)})` : ''}
      </span>
    </div>
  );
}
