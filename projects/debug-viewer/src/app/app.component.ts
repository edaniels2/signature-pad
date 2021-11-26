import { Component, ViewChild } from '@angular/core';
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

  onDrawComplete(event: string) {
    console.log(event);
  }

  clear() {
    this.pad && this.pad.clear();
  }
}
