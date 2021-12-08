# SignaturePad

angular 12+ Bluemoon signature pad

## usage
Import `SignaturePadModule` in NgModule and use tag `bm-signature-pad`.

Requires an `[options]` property binding - import `SignaturePadOptions` for type definition.

### options attributes
 - `width`: number | string (required) - px or % allowed
 - `height`: number | string (required) - px or % allowed
 - `lineWidth`: number - line width in px - default 3
 - `base64`: boolean - false to output as plain text, true to encode as data
 url; default false

 ### output events
 - `drawComplete: string`: triggered on mouse up or call to clear()
 - `viewReady: boolean`: emits `true` when component initialization is complete

### methods
 - `clear()`: clear canvas, triggers `drawComplete` to emit
 an empty svg document
 - `loadSvg(svg: string)`: load a _path specified_ svg to the signature
 pad. Note: if provided with an svg generated from text this method has the
 same effect as `clear()`
