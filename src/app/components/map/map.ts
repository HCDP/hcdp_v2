import { AfterViewInit, Component, ElementRef , Input} from '@angular/core';
import * as L from "leaflet";
import { LeafletCompassRose, RoseControlOptions } from "../controls/leaflet/leaflet-compass-rose/leaflet-compass-rose";
import { LeafletImageExport } from '../controls/leaflet/leaflet-image-export/leaflet-image-export';
import { AssetManager } from '../../services/util/asset-manager';

@Component({
  selector: 'app-map',
  imports: [LeafletCompassRose, LeafletImageExport],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class Map implements AfterViewInit {
  @Input() imageContainer: ElementRef;

  readonly extents: {[county: string]: L.LatLngBoundsExpression} = {
    ka: [ [ 21.819, -159.816 ], [ 22.269, -159.25125 ] ],
    oa: [ [ 21.18, -158.322 ], [ 21.7425, -157.602 ] ],
    ma: [ [ 20.343, -157.35 ], [ 21.32175, -155.92575 ] ],
    bi: [ [ 18.849, -156.243 ], [ 20.334, -154.668 ] ],
    st: [ [ 18.849, -159.816 ], [ 22.269, -154.668 ] ],
    bounds: [ [14.050369038588524, -167.60742187500003], [26.522031143884014, -144.47021484375003] ]
  };

  private baseLayers: {[label: string]: L.TileLayer};

  map: L.Map;
  roseOptions: RoseControlOptions;
  imageHiddenControls = ["leaflet-control-zoom", "leaflet-control-layers", "leaflet-control-export"];

  constructor(private assetService: AssetManager) {
    this.baseLayers = {
      "Satellite (Google)": L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20
      }),
      "Street (Google)": L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20
      }),
      "World Imagery (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }),
      "USGS Topo (USGS)": L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
      }),
      "Shaded Relief (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 13,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri'
      })
    };

    let roseImage = "/arrows/nautical.svg";
    let roseURL = assetService.getAssetURL(roseImage);
    this.roseOptions = {
      image: roseURL,
      position: "bottomleft"
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 0);
  }

  private initMap(): void {
    this.map = L.map("map", {
      layers: [this.baseLayers["Satellite (Google)"]],
      zoom: 7,
      center: L.latLng(20.559, -157.242),
      attributionControl: false,
      minZoom: 6,
      maxBounds: this.extents.bounds
    });
    this.invalidateSize();
    L.control.scale({
      position: 'bottomleft',
      maxWidth: 200
    }).addTo(this.map);
  }

  invalidateSize() {
    this.map.invalidateSize();
  }
}
