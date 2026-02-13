import { Injectable } from '@angular/core';

// shared definitions for backend and frontend
import { COLORS } from '../../../../src/shared/colors';

@Injectable({
  providedIn: 'root'
})
export class ColorsService {

  COLORS = COLORS;
    
  getContrastColor(color: string): string {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.fillStyle = color;
    const computed = ctx.fillStyle;
    let r: number = 0, g: number = 0, b: number = 0;
    const rgbMatch = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
      r = parseInt(rgbMatch[1]);
      g = parseInt(rgbMatch[2]);
      b = parseInt(rgbMatch[3]);
    } else {
      const hexMatch = computed.match(/^#([0-9a-f]{6})$/i);
      if (hexMatch) {
        const hex = hexMatch[1];
        r = parseInt(hex.substring(0,2), 16);
        g = parseInt(hex.substring(2,4), 16);
        b = parseInt(hex.substring(4,6), 16);
      }
    }
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 180 ? 'black' : 'white';
  }
}