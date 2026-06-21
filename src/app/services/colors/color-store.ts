import { Injectable } from '@angular/core';
import { ColorScale } from '../../models/leaflet/colors';
import chroma from "chroma-js";

@Injectable({
  providedIn: 'root',
})
export class ColorStore {

  private colorSchemeMap: Record<ColorScheme, (range: [number, number], reverse: boolean, domainTranslation: (value: number) => number, scaleTranslation: (value: number) => number) => ColorScale> = {
    viridis: this.generateViridisColorScale.bind(this),
    monochromatic: this.generateDefaultMonochromaticRainfallColorScale.bind(this),
    nwsRadar: this.generateNWSRadarColorScale.bind(this),
    turbo: this.generateTurboColorScale.bind(this),
    diverging: this.generateDivergentColorScale.bind(this),
    increasing: this.generateIncreasingColorScale.bind(this)
  };

  private colorSchemeLabelMap: Record<ColorScheme, string> = {
    viridis: "Viridis",
    monochromatic: "Monochromatic",
    nwsRadar: "NWS Radar",
    turbo: "Turbo",
    diverging: "Diverging",
    increasing: "Increasing"
  };


  public getColorScale(id: ColorScheme, range: [number, number], reverse: boolean = false, domainTranslation: (value: number) => number = (value: number) => value, scaleTranslation: (value: number) => number = (value: number) => value) {
    return this.colorSchemeMap[id](range, reverse, domainTranslation, scaleTranslation);
  }


  public getColorSchemeLabel(id: ColorScheme) {
    return this.colorSchemeLabelMap[id];
  }


  private getDomain(range: [number, number], domainTranslation: (value: number) => number): [number, number] {
    return [domainTranslation(range[0]), domainTranslation(range[1])];
  }

  private getRange(range: [number, number], scaleTranslation: (value: number) => number): [number, number] {
    return [scaleTranslation(range[0]), scaleTranslation(range[1])];
  }

  private generateNWSRadarColorScale(range: [number, number], reverse: boolean, domainTranslation: (value: number) => number, scaleTranslation: (value: number) => number): ColorScale {
    let scaledRange = this.getRange(range, scaleTranslation);

    let colors = [
      "#25A1DD",
      "#002EF4",
      "#02FA00", 
      "#309D00",
      "#FDFB00", 
      "#C89B2C", 
      "#FF9A00",
      "#FE3200", 
      "#CE3101",
      "#9A3300",
      "#FF3AFF"
    ];
    if(reverse) {
      colors = colors.reverse();
    }
    let domain = this.getDomain(scaledRange, domainTranslation);
    let colorScale = chroma.scale(colors).domain(domain);

    let getColor = (value: number) => {
      value = domainTranslation(scaleTranslation(value));
      let color = colorScale(value);
      return color;
    }

    return new ColorScale(getColor, range);
  }


  private generateDefaultRainbowRainfallColorScale(range: [number, number], reverse: boolean, domainTranslation: (value: number) => number, scaleTranslation: (value: number) => number): ColorScale {
    let scaledRange = this.getRange(range, scaleTranslation);

    let colors = ['red','yellow','green','blue','purple','indigo'];
    if(reverse) {
      colors = colors.reverse();
    }
    let domain = this.getDomain(scaledRange, domainTranslation);
    let colorScale = chroma.scale(colors).domain(domain);

    let getColor = (value: number) => {
      value = domainTranslation(scaleTranslation(value));
      let color = colorScale(value);
      return color;
    }

    return new ColorScale(getColor, range);
  }

  private generateDefaultMonochromaticRainfallColorScale(range: [number, number], reverse: boolean, domainTranslation: (value: number) => number, scaleTranslation: (value: number) => number): ColorScale {

    let scaledRange = this.getRange(range, scaleTranslation);
    let colors = ["#f7fbff", "#6baed6", "#08519c", "#08306b"];
    if(reverse) {
      colors = colors.reverse();
    }
    //let colors = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"];

    let domain = this.getDomain(scaledRange, domainTranslation);
    let colorScale = chroma.scale(colors).domain(domain).correctLightness();

    let getColor = (value: number) => {
      value = domainTranslation(scaleTranslation(value));
      let color = colorScale(value);
      return color;
    }

    return new ColorScale(getColor, range);
  }

 

  private generateTurboColorScale(range: [number, number], reverse: boolean, domainTranslation: (value: number) => number, scaleTranslation: (value: number) => number): ColorScale {
    let scaledRange = this.getRange(range, scaleTranslation);
    let colors = [
      "#2a0404", "#300405", "#360405", "#3b0406", "#410407", "#470408", "#4d0408", "#530409", 
      "#58040a", "#5e040a", "#64040a", "#6a040b", "#70040b", "#74040c", "#78040d", "#7c030d", 
      "#80030e", "#84030e", "#88020e", "#8c020f", "#90020f", "#940210", "#980110", "#9b0111", 
      "#9f0111", "#a30112", "#a70112", "#aa0113", "#ae0113", "#b10114", "#b50114", "#b80115", 
      "#bc0215", "#bf0316", "#c20416", "#c60517", "#c90618", "#cc0818", "#cf0a19", "#d20c1a", 
      "#d50e1a", "#d8101b", "#db121b", "#dd151c", "#e0181d", "#e21a1d", "#e41d1e", "#e6201e", 
      "#e8231f", "#ea2620", "#ec2920", "#ed2c21", "#ef3022", "#f03322", "#f13623", "#f33a24", 
      "#f43d24", "#f54125", "#f64426", "#f84827", "#f94b28", "#fa4f28", "#fb5229", "#fc562a", 
      "#fc5a2b", "#fd5d2c", "#fe612d", "#fe652e", "#fe682f", "#ff6c30", "#ff7031", "#ff7332", 
      "#ff7733", "#ff7b34", "#ff7e35", "#ff8236", "#ff8637", "#ff8938", "#ff8d39", "#ff913a", 
      "#ff943b", "#ff983c", "#ff9c3d", "#ff9f3e", "#ffa33f", "#ffa740", "#ffaa41", "#ffae42", 
      "#ffb143", "#ffb544", "#ffb945", "#ffbc46", "#ffc047", "#ffc348", "#ffc749", "#ffca4a", 
      "#ffce4a", "#ffd14b", "#ffd44c", "#ffd84d", "#ffdb4e", "#ffde4e", "#ffe24f", "#ffe550", 
      "#fbe851", "#f6ea52", "#f1ed53", "#ebef54", "#e5f154", "#def355", "#d8f556", "#d1f657", 
      "#caf858", "#c3f959", "#bcfa5a", "#b5fc5b", "#aefd5c", "#a7fe5d", "#a0fe5e", "#99ff5f", 
      "#92ff60", "#8bff61", "#84ff62", "#7eff63", "#77ff64", "#71ff65", "#6bff66", "#64ff68", 
      "#5eff69", "#58fe6a", "#52fd6c", "#4dfc6d", "#48fb6f", "#43f970", "#3ef872", "#39f774", 
      "#35f576", "#31f478", "#2df37a", "#2af17c", "#27f07e", "#23ee81", "#21ec83", "#1eeb86", 
      "#1ce988", "#1ae88b", "#18e68e", "#16e491", "#15e394", "#15e197", "#14df9a", "#14dd9d", 
      "#14dba1", "#14d9a4", "#14d7a7", "#14d5ab", "#15d4ae", "#15d2b2", "#16d0b6", "#17ceba", 
      "#18cdbd", "#1acbc1", "#1bc9c5", "#1cc7c9", "#1ec5cc", "#1fc3d0", "#21c1d3", "#22bfd6", 
      "#24bdd9", "#26bbdc", "#28b9df", "#29b7e2", "#2bb4e4", "#2db2e6", "#2fb0e8", "#31aeea", 
      "#33abec", "#35a9ed", "#36a7ee", "#38a4ef", "#3aa2f0", "#3ca0f1", "#3d9df2", "#3e9bf2", 
      "#4098f3", "#4196f3", "#4294f3", "#4391f3", "#448ff3", "#448cf2", "#458af2", "#4587f1", 
      "#4685f0", "#4682ef", "#4680ee", "#467ded", "#467bec", "#4678ea", "#4676e9", "#4673e7", 
      "#4671e5", "#466ee3", "#466ce1", "#4669df", "#4666dc", "#4663d9", "#4661d6", "#455ed3", 
      "#455bcf", "#4559cb", "#4456c7", "#4453c3", "#4351bf", "#434eba", "#434bb5", "#4248b1", 
      "#4146ac", "#4143a7", "#4040a2", "#3f3e9c", "#3f3b97", "#3e3891", "#3d358a", "#3c3285", 
      "#3b307f", "#3a2d79", "#392a73", "#38276c", "#372466", "#36215f", "#351e58", "#341b51", 
      "#33184a", "#321543", "#30123b"
    ];
    if(reverse) {
      colors = colors.reverse();
    }

    let domain = this.getDomain(scaledRange, domainTranslation);
    let colorScale = chroma.scale(colors).domain(domain);

    let getColor = (value: number) => {
      value = domainTranslation(scaleTranslation(value));
      //value = Math.pow(value, 1);
      let color = colorScale(value);
      return color;
    }

    return new ColorScale(getColor, range);
  }

  private generateViridisColorScale(range: [number, number], reverse: boolean, domainTranslation: (value: number) => number, scaleTranslation: (value: number) => number) {
    let scaledRange = this.getRange(range, scaleTranslation);

    // chroma has native Viridis support, but it is "backward" by default
    // reverse domain to reverse
    let domain = this.getDomain(scaledRange, domainTranslation);
    if(!reverse) {
      domain = domain.reverse() as [number, number];
    }
    let colorScale = chroma.scale("Viridis").domain(domain).correctLightness();

    let getColor = (value: number) => {
      value = domainTranslation(scaleTranslation(value));
      let color = colorScale(value);
      return color;
    }
    return new ColorScale(getColor, range);
  }

  private generateDivergentColorScale(range: [number, number], reverse: boolean, domainTranslation: (value: number) => number, scaleTranslation: (value: number) => number) {
    let scaledRange = this.getRange(range, scaleTranslation);

    let colors = [
      "#67001f", "#b2182b", "#d6604d", "#ffffff", 
      "#4393c3", "#2166ac", "#053061"
    ];
    if(reverse) {
      colors = colors.reverse();
    }
    let domain = this.getDomain(scaledRange, domainTranslation);
    let colorScale = chroma.scale(colors).domain(domain);

    let getColor = (value: number) => {
      value = domainTranslation(scaleTranslation(value));
      //value = Math.pow(value, 1);
      let color = colorScale(value);
      return color;
    }

    return new ColorScale(getColor, range);
  }

  private generateIncreasingColorScale(range: [number, number], reverse: boolean, domainTranslation: (value: number) => number, scaleTranslation: (value: number) => number) {
    let scaledRange = this.getRange(range, scaleTranslation);

    let colors = [
      "#800026", "#bd0026", "#e31a1c", 
      "#fc4e2a", "#fd8d3c", "#ffeda0"
    ];
    if(reverse) {
      colors = colors.reverse();
    }
    let domain = this.getDomain(scaledRange, domainTranslation);
    let colorScale = chroma.scale(colors).domain(domain);

    let getColor = (value: number) => {
      value = domainTranslation(scaleTranslation(value));
      let color = colorScale(value);
      return color;
    }

    return new ColorScale(getColor, range);
  }

}


export type ColorScheme = "viridis" | "monochromatic" | "nwsRadar" | "turbo" | "diverging" | "increasing";
