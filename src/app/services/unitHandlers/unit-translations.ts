import { Injectable, Type } from '@angular/core';
import { UnitBase } from '../../models/datasets/recipe';

@Injectable({
  providedIn: 'root',
})
export class UnitTranslations {
  private readonly unitTranslationFunctionMap: Record<string, (value: number) => number> = {
    mm_in: this.convertMm2In,
    in_mm: this.convertIn2Mm,
    c_f: this.convertC2F,
    f_c: this.convertF2C
  }
  
  convert(from: string, to: string, value: number) {
    let conversionKey = `${from}_${to}`;
    let conversionFunct = this.unitTranslationFunctionMap[conversionKey];
    if(!conversionFunct) {
      throw new Error(`Invalid unit conversion. Cannot convert from ${from} to ${to}.`);
    }
    return conversionFunct(value);
  }


  private convertMm2In(mm: number) {
    return mm / 25.4;
  }

  private convertC2F(c: number) {
    return c * 1.8 + 32;
  }

  private convertIn2Mm(inches: number) {
    return inches * 25.4;
  }

  private convertF2C(f: number) {
    return (f - 32) / 1.8;
  }
}