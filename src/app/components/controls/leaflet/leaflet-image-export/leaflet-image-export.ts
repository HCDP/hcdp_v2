import { Component, ElementRef, ViewChild, input, effect, viewChild, ChangeDetectionStrategy } from '@angular/core';
import {Map as LMap, Control, DomUtil, ControlPosition} from 'leaflet';
import * as rasterizeHTML from 'rasterizehtml';

@Component({
  selector: 'app-leaflet-image-export',
  imports: [],
  templateUrl: './leaflet-image-export.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './leaflet-image-export.scss',
})
export class LeafletImageExport {
  datePicker = viewChild.required<ElementRef>("exportControl");

  map = input.required<LMap>();
  imageContainer = input.required<ElementRef>();

  position = input<ControlPosition>("topleft");
  hiddenControls = input<string[]>([]);

  constructor() {
    effect(() => {
      let ExportControl = Control.extend({
        onAdd: function () {
          let control = DomUtil.get("export-control");
          return control;
        }
      });
      new ExportControl({position: this.position()}).addTo(this.map());
    });
  }

  async exportImage(e: PointerEvent) {
    e.stopPropagation();
    
    const mapContainer = this.map().getContainer();
    const pointerEvents = mapContainer.style.pointerEvents;
    mapContainer.style.pointerEvents = "none";
    this.map().keyboard.disable();


    let canvas = document.createElement("canvas");
    let containerEl: HTMLElement = this.imageContainer().nativeElement;
    let nodeReplacements: HTMLNodeReplaceData[] = await this.prepareDOMForExport(containerEl);

    try {
      let mapBounds: DOMRect = containerEl.getBoundingClientRect();
      canvas.width = document.body.clientWidth;
      canvas.height = document.body.clientHeight;
      let ctx = canvas.getContext("2d");
      if(ctx) {
        let defaultDisplays = new Map<HTMLElement, string>();


        for(let className of this.hiddenControls()) {
          for(let element of <any>document.getElementsByClassName(className)) {
            defaultDisplays.set(element, element.style.display);
            element.style.display = "none";
          }
        }


        await rasterizeHTML.drawDocument(document, canvas);
        //copy to a new canvas cut to the right size
        let croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = mapBounds.width;
        croppedCanvas.height = mapBounds.height;
        let croppedCtx = croppedCanvas.getContext("2d");

        if(croppedCtx) {
          let imgData = ctx.getImageData(mapBounds.x, mapBounds.y, mapBounds.width, mapBounds.height);
          croppedCtx.putImageData(imgData, 0, 0);

          let link = document.createElement("a");
          link.download = "HCDP_map.png";
          link.href = croppedCanvas.toDataURL("image/png");
          document.body.appendChild(link);
          link.click();
          //cleanup
          document.body.removeChild(link);
          //reset control displays
          for(let data of defaultDisplays.entries()) {
            data[0].style.display = data[1];
          }
        }
      }
    }
    finally {
      //revert converted image nodes to canvas
      this.revertNodeReplacments(nodeReplacements);
      mapContainer.style.pointerEvents = pointerEvents;
      this.map().keyboard.enable();
    }
  }


  private revertNodeReplacments(replaceData: HTMLNodeReplaceData[]) {
    for(let item of replaceData) {
      for(let data of item.replacements) {
        item.root.removeChild(data.replacement);
        item.root.appendChild(data.original);
      }
    }
  }

  //cannot render canvases
  private async prepareDOMForExport(root: HTMLElement): Promise<HTMLNodeReplaceData[]> {
    let replaceData: HTMLNodeReplaceData[] = [];
    let replaceItem: HTMLNodeReplaceData = {
      root: root,
      replacements: []
    };
    //removing child nodes in forEach causes issues
    for(let child of Array.from(root.childNodes)) {
      let node = <HTMLElement>child;
      if(node.tagName == "IMG") {
        root.removeChild(node);
        let imageNode: HTMLImageElement = <HTMLImageElement>node;

        let sourceClone: HTMLImageElement = new Image;
        sourceClone.crossOrigin = "";
        sourceClone.src = imageNode.src;

        let canvasNode = document.createElement("canvas");
        let ctx = canvasNode.getContext("2d");

        if(ctx) {
          canvasNode.width = imageNode.width;
          canvasNode.height = imageNode.height;
          let imageEl = document.createElement("img");
  
          let imageDrawn = new Promise<void>((resolve) => {
            let drawImageToContext = () => {
              ctx.drawImage(sourceClone, 0, 0);
              let dataURL = canvasNode.toDataURL();
              imageEl.src = dataURL;
              resolve();
            }      
            sourceClone.addEventListener("load", drawImageToContext);
          });
  
          //set html props
          imageEl.className = imageNode.className;
          imageEl.width = imageNode.width;
          for(let style in imageNode.style) {
            try {
              imageEl.style[style] = imageNode.style[style];
            }
            catch {}
          }
          //append image node to root
          root.appendChild(imageEl);
          replaceItem.replacements.push({
            original: imageNode,
            replacement: imageEl
          });
  
          await imageDrawn;
        }
      }
      if(node.tagName == "CANVAS") {
        root.removeChild(node);
        let canvasNode: HTMLCanvasElement = <HTMLCanvasElement>node;
        let dataURL = canvasNode.toDataURL();
        let imageEl = document.createElement("img");
        imageEl.src = dataURL;
        //set html props
        imageEl.className = canvasNode.className;
        imageEl.width = canvasNode.width;
        imageEl.height = canvasNode.height;
        imageEl.style.cssText = canvasNode.style.cssText;

        //append image node to root
        root.appendChild(imageEl);
        replaceItem.replacements.push({
          original: canvasNode,
          replacement: imageEl
        });
      }
      replaceData = replaceData.concat(await this.prepareDOMForExport(node));
    }
    //only add the node if any replacements were made
    if(replaceItem.replacements.length > 0) {
      replaceData.push(replaceItem);
    }

    return replaceData;
  }
}

interface HTMLNodeReplaceData {
  root: HTMLElement,
  replacements: {
    original: HTMLElement,
    replacement: HTMLElement
  }[]
}