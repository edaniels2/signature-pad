export interface SignaturePadOptions {
  height: number | string;
  width: number | string;
  base64?: boolean;
  lineWidth?: number;
}

export class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
