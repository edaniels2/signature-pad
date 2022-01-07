import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

import { curveControlGenerator } from './bezier-spline';
import { Point, SignaturePadOptions } from './models';

/**
 * Captures drawn image and outputs as a string svg definition.
 * @param options - settings object for signature pad. Properties are
 * - width: number | string (required) - px or % allowed
 * - height: number | string (required) - px or % allowed
 * - lineWidth: number - line width in px - default 3
 * - base64: boolean - false to output as plain text, true to encode as data
 * url; default false
 * @public isEmpty: boolean - true if nothing is currently drawn
 * @emits drawComplete: string - on mouse up or call to clear()
 * @method clear() - clear canvas, triggers `drawComplete` to emit
 * an empty svg document
 * @method loadSvg(svg: string) - load a _path specified_ svg to the signature
 * pad. Note: any non-path elements will be ignored.
 */
@Component({
  selector: 'bm-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.css']
})
export class SignaturePadComponent implements AfterViewInit, OnDestroy, OnInit {
  @Input() options: SignaturePadOptions = {
    height: 200,
    width: 200,
  };
  @Output() drawComplete = new EventEmitter<string>();
  @Output() viewReady = new EventEmitter<boolean>();
  @ViewChild('canvas') private canvas!: ElementRef<HTMLCanvasElement>;

  private base64 = false;
  private canvasContext!: CanvasRenderingContext2D;
  private controlPoints = curveControlGenerator();
  private curveStarted = false;
  private eventType: 'pointer' | 'mouse' = 'pointer';
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
    this.controlPoints.next();
  }

  ngAfterViewInit() {
    this.initSvg();
    this.initCanvas();
    this.viewReady.emit(true);
    this.viewReady.complete();
  }

  ngOnDestroy() {
    this.drawComplete.complete();
    this.controlPoints.return();
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
    const scale = window.devicePixelRatio;
    canvas.height = this.height * scale;
    canvas.width = this.width * scale;
    canvas.style.height = this.height + 'px';
    canvas.style.width = this.width + 'px';
    this.canvasContext = canvas.getContext('2d')!;
    this.canvasContext.scale(scale, scale);
    this.canvasContext.lineWidth = this.lineWidth;
    canvas[down] = (e: MouseEvent) => {
      const { x, y } = this.getCanvasCoords(e);
      this.startSvgPath(x, y);
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(x, y);
      this.curveStarted = false;
      canvas[move] = (mv: MouseEvent) => this.draw(mv);
    };
    canvas[up] = () => {
      canvas[move] = null;
      // reset control points generator
      this.controlPoints.return();
      this.controlPoints = curveControlGenerator();
      this.controlPoints.next();

      this.endPath();
      this.onDrawComplete();
    };
  }

  /**
   * Dampen the control point if needed. This prevents the curve from overshooting/oscillating
   * when there is a sudden large change in the pointer position - generally happens if the
   * pointer goes off the edge of the canvas and then returns.
   */
  private dampenControlPoint(control: Point, path: Point, maxDistance = 8) {
    let dist = Math.sqrt(Math.pow(Math.abs(path.x - control.x) + Math.abs(path.y - control.y), 2));
    while (dist > maxDistance) {
      const dx = (control.x - path.x) / 2;
      const dy = (control.y - path.y) / 2;
      control.x -= dx;
      control.y -= dy;
      dist = Math.sqrt(Math.pow(Math.abs(path.x - control.x) + Math.abs(path.y - control.y), 2));
    }
    return control;
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

    const point = this.getCanvasCoords(mouse);
    const controlPoints = this.controlPoints.next(point);
    if (controlPoints.value) {
      const [ctl1, ctl2] = controlPoints.value;
      this.dampenControlPoint(ctl1, point);
      this.dampenControlPoint(ctl2, point);
      this.canvasContext.bezierCurveTo(ctl1.x, ctl1.y, ctl2.x, ctl2.y, point.x, point.y);
      this.canvasContext.stroke();
      this.svgAddCurvePath(ctl1, ctl2, point);
      this.curveStarted = true;
    }
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
    this.path = `<path d="M ${x.toFixed(2)} ${y.toFixed(2)} `;
    this._isEmpty = false;
  }

  private svgAddCurvePath(ctl1: Point, ctl2: Point, end: Point) {
    if (this.curveStarted) {
      this.path += `S ${ctl2.x.toFixed(2)} ${ctl2.y.toFixed(2)},
        ${end.x.toFixed(2)} ${end.y.toFixed(2)} `;
    } else {
      this.path += `C ${ctl1.x.toFixed(2)} ${ctl1.y.toFixed(2)},
        ${ctl2.x.toFixed(2)} ${ctl2.y.toFixed(2)},
        ${end.x.toFixed(2)} ${end.y.toFixed(2)} `;
    }
  }

  /**
   * Append path data to the current svg string, and closes the svg path tag
   */
  private endPath() {
    if (!this.path) {
      return;
    }
    if (!this.curveStarted) {
      // this was a click with no movement, so add a dot
      this.path += 'q 1 -1, 2 0 q -1 1, -2 0';
      this.canvasContext.stroke(new Path2D(this.path.substring(9)));
    }
    this.svgString += `${this.path}"/>`;
    this.path = '';
    this.canvasContext.closePath();
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
    this.canvasContext.clearRect(0, 0, this.width, this.height);
    this.canvasContext.beginPath();
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
          this.canvasContext.lineWidth = lineWidth;
          this.canvasContext.stroke(new Path2D(match[1]));
        }
      }
      this.svgString = data.replace(/<\/svg>/g, '');
      this._isEmpty = false;
      this.onDrawComplete();
    }
  }
}
