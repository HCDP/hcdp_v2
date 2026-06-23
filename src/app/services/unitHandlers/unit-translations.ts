import { Injectable, Type } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UnitTranslations {
  private readonly unitTranslationFunctionMap: Record<UnitTranslationTypes, (value: number) => number> = {
    "mm_in": this.convertMm2In,
    "c_f": this.convertC2F
  }
  
  getUnitTranslationF(type: UnitTranslationTypes) {
    return this.unitTranslationFunctionMap[type];
  }


  convertMm2In(mm: number) {
    return mm / 25.4;
  }

  convertC2F(c: number) {
    return c * 1.8 + 32;
  }
}

export type UnitTranslationTypes = "mm_in" | "c_f"