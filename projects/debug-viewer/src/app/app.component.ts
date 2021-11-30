import { Component, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SignaturePadComponent, SignaturePadOptions } from 'signature-pad';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild(SignaturePadComponent) pad: SignaturePadComponent | null = null;
  options: SignaturePadOptions = {
    height: 200,
    width: 800,
  }
  svg: SafeHtml = '';
  svgRaw = '';

  constructor(private sanitizer: DomSanitizer) { }

  onDrawComplete(event: string) {
    this.svgRaw = event;
    this.svg = this.sanitizer.bypassSecurityTrustHtml(event);
  }

  clear() {
    this.pad && this.pad.clear();
  }
}
