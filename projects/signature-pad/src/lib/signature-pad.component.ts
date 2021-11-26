import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

import { SignaturePadOptions } from './signature-pad-options.model';

/**
 * A stripped-down implementation of signature pad. Captures drawn image and
 * outputs as a string svg definition
 * @param options - settings object for signature pad. Properties are
 * - width: number | string (required) - px or % allowed
 * - height: number | string (required) - px or % allowed
 * - lineWidth: number - line width in px - default 3
 * - base64: boolean - false to output as plain text, true to encode as data
 * url; default false
 * @emits drawComplete: string - on mouse up or call to clear()
 * @method clear() - clear canvas, triggers `drawComplete` to emit
 * an empty svg document
 * @method loadSvg(svg: string) - load a _path specified_ svg to the signature
 * pad. Note: if provided with an svg generated from text this method has the
 * same effect as `clear()`
 */
@Component({
  selector: 'bm-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.css']
})
export class SignaturePadComponent implements AfterViewInit, OnDestroy, OnInit {
  @Input() options!: SignaturePadOptions;
  @Output() drawComplete = new EventEmitter<string>();
  @Output() viewReady = new EventEmitter<boolean>();
  @ViewChild('canvas') private canvas!: ElementRef<HTMLCanvasElement>;

  private base64 = false;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private eventType: 'pointer' | 'mouse' | null = null;
  private height = 0;
  private lineWidth = 3;
  private path = '';
  private svgString = '';
  private width = 0;
  private _isEmpty = true;

  public get isEmpty() {
    return this._isEmpty;
  }

  constructor(private elementRef: ElementRef) { }

  ngOnInit() {
    this.setConfigOptions();
  }

  ngAfterViewInit() {
    this.initSvg();
    this.initCanvas();
    this.viewReady.emit(true);
    this.viewReady.complete();
  }

  ngOnDestroy() {
    this.drawComplete.complete();
  }

  /**
   * Setup the canvas for drawing. Uses PointerEvent API if available
   * (~90% of users according to caniuse.com), which extends MouseEvent
   * and additionally provides touch ui functionality.
   */
  private initCanvas() {
    this.eventType = window && window.PointerEvent ? 'pointer' : 'mouse';
    const down = `on${this.eventType}down` as const;
    const move = `on${this.eventType}move` as const;
    const up = `on${this.eventType}up` as const;
    const canvas = this.canvas.nativeElement;
    canvas.height = this.height;
    canvas.width = this.width;
    this.canvasContext = canvas.getContext('2d') as CanvasRenderingContext2D;
    canvas[down] = (e: MouseEvent) => {
      const { x, y } = this.getCanvasCoords(e);
      this.startSvgPath(x, y);
      this.canvasContext!.moveTo(x, y);
      canvas[move] = (mv: MouseEvent) => this.draw(mv);
    };
    canvas[up] = () => {
      canvas[move] = null;
      this.endSvgPath();
      this.onDrawComplete();
    };
  }

  /**
   * Draw a line segment to the canvas and svg document from
   * a mouse movement event
   * @param mouse MouseEvent
   */
  private draw(mouse: MouseEvent) {
    // check for button released while outside of canvas area
    if (mouse.buttons % 2 === 0) {
      const mouseUp = this.canvas.nativeElement[`on${this.eventType!}up` as const] as () => void;
      return mouseUp && mouseUp.call(this);
    }

    const { x, y } = this.getCanvasCoords(mouse);
    this.drawSvgPath(x, y);
    this.canvasContext!.lineTo(x, y);
    this.canvasContext!.lineWidth = this.lineWidth;
    this.canvasContext!.stroke();
  }

  /**
   * Return the coordinates of a mouse event relative to the canvas
   * @param mouse MouseEvent
   */
  private getCanvasCoords(mouse: MouseEvent) {
    const { left: offsetX, top: offsetY } = this.canvas.nativeElement.getBoundingClientRect();
    const x = mouse.clientX - offsetX;
    const y = mouse.clientY - offsetY;
    return { x, y };
  }

  /**
   * Emit the current svg image
   */
  private onDrawComplete() {
    let svgOut = `${this.svgString}</svg>`;
    svgOut = svgOut.replace(/\s+/g, ' ');
    if (this.base64) {
      svgOut = `data:image/svg+xml;base64,${btoa(svgOut)}`;
    }
    this.drawComplete.emit(svgOut);
  }

  /**
   * Initialize the svg templates
   */
  private initSvg() {
    this.svgString = `<?xml version='1.0' encoding='utf-8' ?>
      <svg xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        esign_new="1"
        fill="none"
        stroke="black"
        stroke-linecap="round"
        stroke-width="${this.lineWidth}"
        viewBox="0 0 ${this.width} ${this.height}">`;
  }

  private startSvgPath(x: number, y: number) {
    this.path = `<path d="M ${x} ${y} `;
    this._isEmpty = false;
  }

  /**
   * Add a line segment to the current path, starts at the previous point and
   * ends at the provided coordinates.
   *
   * @todo This works well enough but is definitely not optimized.
   * Ideally these would be bezier curves but I haven't come up with
   * a way to calculate the neccesary control points.
   */
  private drawSvgPath(x: number, y: number) {
    this.path += `L ${x} ${y} `;
  }

  /**
   * Adds a final draw point if coordinates are provided, and closes the svg path tag
   * @param x (optional) x coordinate of final point
   * @param y (optional) y coordinate of final point
   */
  private endSvgPath(x?: number, y?: number) {
    if (x && y) {
      this.drawSvgPath(x, y);
    }
    this.path += '"/>';
    this.svgString += this.path;
  }

  /**
   * Set local config variables from options object. If dimensions were
   * passed as percent, convert to pixels based on container size
   */
  private setConfigOptions() {
    const { height: configHeight, width: configWidth } = this.options;
    if (typeof configHeight === 'string' && configHeight.endsWith('%')) {
      const containerHeight = this.elementRef.nativeElement.parentElement.clientHeight;
      this.height = Math.ceil(containerHeight * parseInt(configHeight, 10) / 100);
    } else {
      this.height = parseInt(configHeight.toString(), 10);
    }
    if (typeof configWidth === 'string' && configWidth.endsWith('%')) {
      const containerWidth = this.elementRef.nativeElement.parentElement.clientWidth;
      this.width = Math.ceil(containerWidth * parseInt(configWidth, 10) / 100);
    } else {
      this.width = parseInt(configWidth.toString(), 10);
    }

    this.base64 = this.options.base64 || false;
    this.lineWidth = this.options.lineWidth || this.lineWidth;
  }

  /**
   * Clear the canvas and reset the internal svg document.
   * Emits a blank svg to the `drawComplete` event.
   */
  clear() {
    this._isEmpty = true;
    this.initSvg();
    this.onDrawComplete();
    this.canvasContext!.clearRect(0, 0, this.width, this.height);
    this.canvasContext!.beginPath();
  }

  /**
   * Load an existing svg image
   *
   * @description this could probably be cleaned up a bit but the general idea
   * is it will sort out whether the incoming svg data was a drawn image or
   * generated from text. If it's text the canvas is cleared and emits a new blank
   * image, and if it's a drawing it's applied to the canvas and the internal svg
   * without a closing tag so additional paths can be appended.
   */
  loadSvg(data: string) {
    if (!data) {
      return;
    }
    const encoded = !data.startsWith('<');
    if (encoded) {
      data = atob(data.replace('data:image/svg+xml;base64,', '').trim());
    }
    const generated = /<text/.test(data);
    if (generated) {
      this.clear();
    } else {
      const widthMatch = data.match(/stroke-width\s?=\s?"(\d+(?:\.\d+)?)"/); // should non-integer values be allowed here?
      const lineWidth = widthMatch ? parseInt(widthMatch[1], 10) : this.lineWidth;
      const paths = data.split('path');
      for (const path of paths) {
        const match = path.match(/d\s?=\s?"([^"]*)"/);
        if (match) {
          this.canvasContext!.lineWidth = lineWidth;
          this.canvasContext!.stroke(new Path2D(match[1]));
        }
      }
      this.svgString = data.replace(/<\/svg>/g, '');
      this._isEmpty = false;
      this.onDrawComplete();
    }
  }
}
