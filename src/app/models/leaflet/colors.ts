import { Scale, Color } from "chroma-js";

export class ColorScale {
  private colors: Color[];
  private range: [number, number];

  constructor(scale: Scale | ((value: number) => Color), range: [number, number], buckets: number = 500) {
    this.colors = [];
    this.range = range;

    let span = range[1] - range[0];
    let interval = span / buckets;
    let value: number;
    let i: number;
    for(i = 0, value = range[0]; i < buckets; i++, value += interval) {
      let color = scale(value);
      this.colors.push(color);
    }
  }

  getColor(value: number): Color {
    let index = this.getColorIndex(value);
    let color = this.colors[index];
    return color;
  }

  private getColorIndex(value: number): number {
    let span = this.range[1] - this.range[0];

    let offset: number;
    //if beyond range then scale to extrema
    if(value < this.range[0]) {
      offset = 0;
    }
    else if(value > this.range[1]) {
      offset = span;
    }
    //otherwise scale as offset
    else {
      offset = value - this.range[0];
    }

    let values = this.colors.length;

    //get scale of offset (0-1)
    let scale = offset / span;
    //get position in value array scale
    let pos = scale * (values - 1);
    //get nearest index
    let index = Math.round(pos);
    return index;
  }

  getRange(): [number, number] {
    return [...this.range];
  }

  getColors(): Color[] {
    return [...this.colors];
  }
}