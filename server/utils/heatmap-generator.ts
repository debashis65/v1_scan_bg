import { createCanvas, Canvas, CanvasRenderingContext2D as NodeCanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

export type Point = {
  x: number;
  y: number;
  intensity: number;
  location?: string;
};

export type FootShape = {
  outline: Array<[number, number]>;
  length: number;
  width: number;
  side: 'left' | 'right';
};

export type HeatmapOptions = {
  width: number;
  height: number;
  radius: number;
  intensityFactor: number;
  colorGradient: string[];
  footOutline?: FootShape;
  gridSize?: number;
  showGrid?: boolean;
  transparentBackground?: boolean;
  outputFormat?: 'png' | 'jpeg' | 'dataURL';
  quality?: number;
};

const DEFAULT_OPTIONS: HeatmapOptions = {
  width: 500,
  height: 800,
  radius: 30,
  intensityFactor: 0.6,
  colorGradient: [
    '#0000ff', // Blue (low pressure)
    '#00ffff', // Cyan
    '#00ff00', // Green
    '#ffff00', // Yellow
    '#ff0000'  // Red (high pressure)
  ],
  gridSize: 50,
  showGrid: false,
  transparentBackground: false,
  outputFormat: 'png',
  quality: 0.9
};

/**
 * Standard foot outlines based on typical foot measurements
 * Coordinates are normalized to be scaled to any canvas size
 */
export const STANDARD_FOOT_OUTLINES: Record<'left' | 'right', FootShape> = {
  left: {
    outline: [
      [0.5, 0.05], // Top of the foot
      [0.4, 0.1],
      [0.3, 0.2],
      [0.25, 0.3],
      [0.2, 0.4],
      [0.2, 0.5],
      [0.25, 0.6],
      [0.3, 0.7],
      [0.35, 0.8],
      [0.4, 0.85],
      [0.45, 0.9],
      [0.5, 0.95],
      [0.55, 0.9],
      [0.6, 0.85],
      [0.65, 0.8],
      [0.7, 0.7],
      [0.75, 0.6],
      [0.8, 0.5],
      [0.8, 0.4],
      [0.75, 0.3],
      [0.7, 0.2],
      [0.6, 0.1],
      [0.5, 0.05]
    ],
    length: 1.0,
    width: 0.6,
    side: 'left'
  },
  right: {
    outline: [
      [0.5, 0.05], // Top of the foot
      [0.4, 0.1],
      [0.3, 0.2],
      [0.25, 0.3],
      [0.2, 0.4],
      [0.2, 0.5],
      [0.25, 0.6],
      [0.3, 0.7],
      [0.35, 0.8],
      [0.4, 0.85],
      [0.45, 0.9],
      [0.5, 0.95],
      [0.55, 0.9],
      [0.6, 0.85],
      [0.65, 0.8],
      [0.7, 0.7],
      [0.75, 0.6],
      [0.8, 0.5],
      [0.8, 0.4],
      [0.75, 0.3],
      [0.7, 0.2],
      [0.6, 0.1],
      [0.5, 0.05]
    ],
    length: 1.0,
    width: 0.6,
    side: 'right'
  }
};

/**
 * Class for generating pressure heatmaps based on point data
 */
export class PressureHeatmapGenerator {
  /**
   * Generate a heatmap from pressure points
   * 
   * @param pressurePoints Array of points with x, y coordinates and intensity values
   * @param options Configuration options for the heatmap
   * @returns Buffer or data URL of the generated heatmap
   */
  public static generateHeatmap(
    pressurePoints: Point[],
    customOptions: Partial<HeatmapOptions> = {}
  ): Buffer | string {
    // Merge default options with custom options
    const options: HeatmapOptions = { ...DEFAULT_OPTIONS, ...customOptions };
    
    // Create canvas and get context
    const canvas = createCanvas(options.width, options.height);
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, options.width, options.height);
    
    // Set background
    if (!options.transparentBackground) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, options.width, options.height);
    }
    
    // Draw grid if enabled
    if (options.showGrid && options.gridSize) {
      this.drawGrid(ctx, options.width, options.height, options.gridSize);
    }
    
    // Draw foot outline if available
    if (options.footOutline) {
      this.drawFootOutline(ctx, options.footOutline, options.width, options.height);
    }
    
    // Generate the heatmap using the provided pressure points
    this.drawHeatmap(ctx, pressurePoints, options);
    
    // Return the result in the requested format
    if (options.outputFormat === 'dataURL') {
      // For data URL, use PNG format
      return canvas.toDataURL('image/png', options.quality);
    } else {
      // For Buffer, use specified format
      const mimeType = options.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      return canvas.toBuffer(mimeType, {
        quality: options.quality || 0.9
      });
    }
  }
  
  /**
   * Draw grid on canvas
   */
  private static drawGrid(
    ctx: NodeCanvasRenderingContext2D,
    width: number,
    height: number,
    gridSize: number
  ): void {
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 0.5;
    
    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
  
  /**
   * Draw foot outline on canvas
   */
  private static drawFootOutline(
    ctx: NodeCanvasRenderingContext2D,
    footShape: FootShape,
    width: number,
    height: number
  ): void {
    const outline = footShape.outline;
    
    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    
    // First point
    ctx.moveTo(outline[0][0] * width, outline[0][1] * height);
    
    // Remaining points
    for (let i = 1; i < outline.length; i++) {
      ctx.lineTo(outline[i][0] * width, outline[i][1] * height);
    }
    
    ctx.closePath();
    ctx.stroke();
    
    // Draw dashed centerline
    this.drawCenterLine(ctx, footShape, width, height);
  }
  
  /**
   * Draw centerline through foot
   */
  private static drawCenterLine(
    ctx: NodeCanvasRenderingContext2D,
    footShape: FootShape,
    width: number,
    height: number
  ): void {
    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([5, 3]);
    
    // Draw dashed centerline through the foot
    ctx.moveTo(width * 0.5, height * 0.05); // Top of foot
    ctx.lineTo(width * 0.5, height * 0.95); // Bottom of foot
    
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  /**
   * Draw the actual heatmap using the pressure points
   */
  private static drawHeatmap(
    ctx: NodeCanvasRenderingContext2D,
    points: Point[],
    options: HeatmapOptions
  ): void {
    // Create offscreen buffer for rendering the heatmap
    const offscreenCanvas = createCanvas(options.width, options.height);
    const offCtx = offscreenCanvas.getContext('2d');
    
    // Draw points with radial gradients
    points.forEach(point => {
      const { x, y, intensity } = point;
      
      // Calculate actual coordinates based on canvas size
      const actualX = x * options.width;
      const actualY = y * options.height;
      const actualRadius = options.radius * (0.5 + intensity * 0.5); // Radius varies with intensity
      
      // Adjust intensity for better visualization
      const adjustedIntensity = Math.min(1, intensity * options.intensityFactor);
      
      // Create radial gradient for point
      const gradient = offCtx.createRadialGradient(
        actualX, actualY, 0,
        actualX, actualY, actualRadius
      );
      
      // Get color from gradient based on intensity
      const color = this.getColorForIntensity(adjustedIntensity, options.colorGradient);
      
      // Add color stops to gradient
      gradient.addColorStop(0, this.addAlpha(color, 0.8));
      gradient.addColorStop(0.5, this.addAlpha(color, 0.5));
      gradient.addColorStop(1, this.addAlpha(color, 0));
      
      offCtx.fillStyle = gradient;
      offCtx.beginPath();
      offCtx.arc(actualX, actualY, actualRadius, 0, Math.PI * 2);
      offCtx.fill();
    });
    
    // Apply the offscreen buffer to the main canvas using alpha blending
    ctx.globalCompositeOperation = 'multiply';
    // Using custom drawImage to avoid TypeScript issues with Canvas's drawImage method
    ctx.drawImage(offscreenCanvas as any, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
  
  /**
   * Get color for a specific intensity value from the gradient
   */
  private static getColorForIntensity(intensity: number, colorGradient: string[]): string {
    if (intensity <= 0) return colorGradient[0];
    if (intensity >= 1) return colorGradient[colorGradient.length - 1];
    
    const segmentSize = 1 / (colorGradient.length - 1);
    const segmentIndex = Math.floor(intensity / segmentSize);
    const segmentPosition = (intensity - segmentIndex * segmentSize) / segmentSize;
    
    const color1 = this.hexToRgb(colorGradient[segmentIndex]);
    const color2 = this.hexToRgb(colorGradient[segmentIndex + 1]);
    
    const r = Math.round(color1.r + segmentPosition * (color2.r - color1.r));
    const g = Math.round(color1.g + segmentPosition * (color2.g - color1.g));
    const b = Math.round(color1.b + segmentPosition * (color2.b - color1.b));
    
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
  
  /**
   * Add alpha channel to color
   */
  private static addAlpha(color: string, alpha: number): string {
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    } else if (color.startsWith('#')) {
      const { r, g, b } = this.hexToRgb(color);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }
  
  /**
   * Create standard foot pressure points for a typical distribution
   * This is used for generating demo or default pressure maps
   */
  public static createStandardPressurePoints(footSide: 'left' | 'right'): Point[] {
    // Define standard pressure points
    const points: Point[] = [
      // Heel area (high pressure)
      { x: 0.5, y: 0.85, intensity: 0.9, location: 'Heel Center' },
      { x: 0.45, y: 0.82, intensity: 0.8, location: 'Medial Heel' },
      { x: 0.55, y: 0.82, intensity: 0.8, location: 'Lateral Heel' },
      
      // Arch area (low pressure)
      { x: 0.45, y: 0.6, intensity: 0.2, location: 'Medial Arch' },
      { x: 0.55, y: 0.6, intensity: 0.3, location: 'Lateral Arch' },
      
      // Ball of the foot (high pressure)
      { x: 0.45, y: 0.3, intensity: 0.85, location: '1st Metatarsal' },
      { x: 0.5, y: 0.28, intensity: 0.75, location: '2nd Metatarsal' },
      { x: 0.55, y: 0.28, intensity: 0.7, location: '3rd Metatarsal' },
      { x: 0.6, y: 0.3, intensity: 0.65, location: '4th Metatarsal' },
      { x: 0.65, y: 0.32, intensity: 0.6, location: '5th Metatarsal' },
      
      // Toes (medium pressure)
      { x: 0.45, y: 0.15, intensity: 0.5, location: 'Great Toe' },
      { x: 0.5, y: 0.12, intensity: 0.4, location: '2nd Toe' },
      { x: 0.55, y: 0.1, intensity: 0.3, location: '3rd Toe' },
      { x: 0.6, y: 0.12, intensity: 0.25, location: '4th Toe' },
      { x: 0.65, y: 0.15, intensity: 0.2, location: '5th Toe' }
    ];
    
    // Mirror points for right foot if needed
    if (footSide === 'right') {
      return points.map(point => ({
        ...point,
        x: 1 - point.x
      }));
    }
    
    return points;
  }
  
  /**
   * Generate a pressure heatmap for a specific scan and save it to disk
   */
  public static async generateAndSaveScanHeatmap(
    scanId: number,
    pressurePoints: Point[],
    footSide: 'left' | 'right',
    outputDir: string
  ): Promise<{ filePath: string, dataUrl: string }> {
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get the standard foot outline based on foot side
    const footOutline = STANDARD_FOOT_OUTLINES[footSide];
    
    // Generate heatmap
    const heatmapBuffer = this.generateHeatmap(pressurePoints, {
      footOutline,
      width: 600,
      height: 1000,
      showGrid: true
    }) as Buffer;
    
    // Generate data URL for web use
    const dataUrl = this.generateHeatmap(pressurePoints, {
      footOutline,
      width: 600,
      height: 1000,
      showGrid: true,
      outputFormat: 'dataURL'
    }) as string;
    
    // Save to disk
    const fileName = `scan_${scanId}_${footSide}_pressure_heatmap.png`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, heatmapBuffer);
    
    return { filePath, dataUrl };
  }
}