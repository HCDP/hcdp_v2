import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AssetManager {
  private assetBase: string;

  constructor(private domSanitizer: DomSanitizer) {
    this.assetBase = `${environment.assetBaseUrl}assets/`;
  }

  getAssetURL(asset: string): string {
    let cleanAsset = asset.replace(/^\//, "");
    let url = `${this.assetBase}${cleanAsset}`;
    return url;
  }

  getTrustedResourceURL(asset: string): SafeResourceUrl {
    let url = this.getAssetURL(asset);
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
