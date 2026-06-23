import { afterNextRender, Component, computed, effect, ElementRef, inject, Injector, input, signal, viewChild, untracked, EffectRef } from '@angular/core';
import * as L from "leaflet";
import { LeafletCompassRose, RoseControlOptions } from "../controls/leaflet/leaflet-compass-rose/leaflet-compass-rose";
import { LeafletImageExport } from '../controls/leaflet/leaflet-image-export/leaflet-image-export';
import { AssetManager } from '../../services/util/asset-manager';
import { HCDPDataset, HCDPDatasetTimeseriesVisualization, HCDPDatasetVisualization, HCDPVisSubtypes } from '../../models/datasets/dataset';
import { LeafletColorScale } from '../controls/leaflet/leaflet-color-scale/leaflet-color-scale';
import { RasterData } from '../../models/leaflet/rasterData';
import { ColorScale } from '../../models/leaflet/colors';
import { HCDPStationDataManager, StationData } from '../../models/datasets/stations';
import { rasterLayer, RasterLayer } from '../../models/leaflet/rasterLayer';
import { MatSliderModule } from '@angular/material/slider';
import { Spinner } from 'spin.js';
import { LayerData } from '../../models/datasets/recipe';


@Component({
  selector: 'app-map',
  imports: [LeafletCompassRose, LeafletImageExport, LeafletColorScale, MatSliderModule],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class Map {
  private injector = inject(Injector);
  private assetService = inject(AssetManager);

  imageContainer = input.required<ElementRef>();
  dataset = input.required<HCDPDatasetVisualization>();
  typedDataset = computed(() => {
    return this.dataset() as HCDPVisSubtypes;
  });

  readonly isSpinning = computed(() => {
    const dataset = this.typedDataset();
    if (!dataset || !dataset.dataStreams) return false;

    const manager = dataset.dataStreams;
    const layers = dataset.mapState?.layers || [];

    return layers.some((layer: LayerData) => {
      const resource = manager.getStream(layer.stream);
      return resource?.isLoading?.() ?? false;
    });
  });

  readonly mapOpacity = signal<number>(100);

  private mapSpinner = new Spinner({
    lines: 12, 
    length: 10, 
    width: 4, 
    radius: 12, 
    color: '#fff',
    zIndex: 1000
  });

  mapElement = viewChild.required<ElementRef<HTMLDivElement>>('mapElement');

  readonly activeColorScale = signal<ColorScale | undefined>(undefined);
  readonly mapRange = signal<[number, number] | undefined>(undefined, {
    equal: (a, b) => {
      if(a === b) return true;
      if(!a || !b) return false;
      return a[0] === b[0] && a[1] === b[1];
    }
  });

  readonly extents: {[county: string]: L.LatLngBoundsExpression} = {
    ka: [ [ 21.819, -159.816 ], [ 22.269, -159.25125 ] ],
    oa: [ [ 21.18, -158.322 ], [ 21.7425, -157.602 ] ],
    ma: [ [ 20.343, -157.35 ], [ 21.32175, -155.92575 ] ],
    bi: [ [ 18.849, -156.243 ], [ 20.334, -154.668 ] ],
    st: [ [ 18.849, -159.816 ], [ 22.269, -154.668 ] ],
    bounds: [ [14.050369038588524, -167.60742187500003], [26.522031143884014, -144.47021484375003] ]
  };

  private baseLayers: {[label: string]: L.TileLayer};
  private layerControl!: L.Control.Layers; // <-- Store the control reference

  map = signal<L.Map | undefined>(undefined);
  roseOptions: RoseControlOptions;
  imageHiddenControls = ["leaflet-control-zoom", "leaflet-control-layers", "leaflet-control-export"];

  constructor() {
    this.baseLayers = {
      "Satellite (Google)": L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom: 20, zIndex: 1 }),
      "Street (Google)": L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 20, zIndex: 1 }),
      "World Imagery (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, zIndex: 1 }),
      "USGS Topo (USGS)": L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, zIndex: 1 }),
      "Shaded Relief (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', { maxZoom: 13, zIndex: 1 })
    };

    let roseImage = "/arrows/nautical.svg";
    let roseURL = this.assetService.getAssetURL(roseImage);
    this.roseOptions = {
      image: roseURL,
      position: "bottomleft"
    };

    afterNextRender(() => {
      this.initMap();
    });

    effect(() => {
      const map = this.map();
      const spinning = this.isSpinning();

      if(map) {
        if(spinning) {
          this.mapSpinner.spin(map.getContainer());
        }
        else {
          this.mapSpinner.stop();
        }
      }
    });

    effect((onDatasetCleanup) => {
      if(!this.map()) return;

      let map = this.map()!;
      const datasetLayerGroup = L.layerGroup().addTo(map);
      let isCancelled = false;

      const childEffects = this.handleDatasetStreams(map, datasetLayerGroup, () => isCancelled);

      onDatasetCleanup(() => {
        isCancelled = true;
        map.removeLayer(datasetLayerGroup);
        childEffects.forEach(eRef => eRef?.destroy());
      });
    });

    // listen for image container resizing and invalidate map size
    effect((onCleanup) => {
      const element = this.imageContainer().nativeElement;
      let invalidateSizeThrottle: number;
      const resizeObserver = new ResizeObserver(() => {
        // clear throttle to prevent refires
        clearTimeout(invalidateSizeThrottle);
        // throttle map size invalidation against rapid triggers
        invalidateSizeThrottle = setTimeout(() => {
          this.invalidateSize();
        }, 100);
      });
      resizeObserver.observe(element);
      onCleanup(() => {
        resizeObserver.disconnect();
      });
    });
  }

  updateOpacity(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    
    this.mapOpacity.set(value);
    this.typedDataset().mapState.opacity = value;
  }

  private initMap(): void {
    const map = L.map(this.mapElement().nativeElement, {
      layers: [this.baseLayers["Satellite (Google)"]],
      zoom: 7,
      center: L.latLng(20.559, -157.242),
      attributionControl: false,
      minZoom: 6,
      maxBounds: this.extents.bounds
    });
    this.map.set(map);
    this.invalidateSize();
    L.control.scale({
      position: 'bottomleft',
      maxWidth: 200
    }).addTo(map);

    let CustomLayerControl = L.Control.Layers.extend({
      onAdd: function(this: any): HTMLElement {
        this._initLayout();
        this._addOpacitySlider();
        this._update();
        return this._container;
      },
      _addOpacitySlider: function(this: any) {
        let controlContainer = this._addContainer();
        let control = L.DomUtil.get("opacity-control");
        if(control) {
          controlContainer.appendChild(control);
          L.DomEvent.disableClickPropagation(controlContainer);
        }
      },
      _addContainer: function(this: any) {
        let elements = this._container.getElementsByClassName('leaflet-control-layers-list');
        let controlContainer = L.DomUtil.create("div", "", elements[0]);
        return controlContainer;
      }
    }) as any;

    // Instantiate properly using 'new' and save the reference
    this.layerControl = new CustomLayerControl(this.baseLayers, undefined, {
      position: 'topright',
      collapsed: true
    }).addTo(map);
  }

  invalidateSize() {
    this.map()?.invalidateSize();
  }

  setColorScale(colorScale: ColorScale) {
    this.activeColorScale.set(colorScale);
  }

  private handleDatasetStreams(mapInstance: L.Map, datasetLayerGroup: L.LayerGroup, isCancelled: () => boolean): EffectRef[] {
    const dataStreamsManager = this.typedDataset().dataStreams;
    if (isCancelled()) return [];

    const { layers } = this.typedDataset().mapState;
    this.mapOpacity.set(this.typedDataset().mapState.opacity);

    const createdEffects: EffectRef[] = [];

    for (let layer of layers) {
      let { stream, label } = layer;
      let type = dataStreamsManager.getStreamType(stream);
      let dataStream = dataStreamsManager.getStream(stream);

      let layerEffectRef: EffectRef;

      // Step outside the reactive context to create the inner effect safely
      untracked(() => {
        layerEffectRef = effect((onLayerCleanup) => {
          const data = dataStream.value();
          const colorScale = this.activeColorScale();

          if(!data || !colorScale) return;

          let leafletLayer: L.Layer | undefined;
          let cleanupEvent = () => {};

          switch(type) {
            case "stations": {
              const dataManager = data as HCDPStationDataManager;
              const stations: StationData[] = dataManager.filteredStations();
              const stationGroup = L.featureGroup();

              const pivotZoom = 10;
              const weightToRadiusFactor = 0.4;
              const pivotRadius = 7;

              const computeMarkerSizing = () => {
                let radius = pivotRadius;
                let zoom = mapInstance.getZoom();
                if(zoom < pivotZoom) {
                  let scale = mapInstance.getZoomScale(zoom, pivotZoom);
                  radius = pivotRadius * scale;
                }
                let weight = radius * weightToRadiusFactor;
                return { radius, weight };
              }

              stations.forEach((station: StationData) => {
                const markerColor = colorScale!.getColor(station.value).hex(); 
                const { radius, weight } = computeMarkerSizing();
                const circle = L.circleMarker([station.lat, station.lng], {
                  radius,
                  fillColor: markerColor,
                  color: '#000',
                  weight,
                  opacity: 1,
                  fillOpacity: 1
                });

                stationGroup.addLayer(circle);
              });

              leafletLayer = stationGroup;

              const onZoomEnd = () => {
                const { radius, weight } = computeMarkerSizing();
                stationGroup.eachLayer((layer: any) => {
                  if(layer.setRadius) {
                    layer.setRadius(radius);
                    layer.setStyle({ weight });
                  }
                });
              };

              mapInstance.on("zoomend", onZoomEnd);

              cleanupEvent = () => {
                mapInstance.off("zoomend", onZoomEnd);
              };

              break;
            }

            case "raster": {
              const rasterData = data as RasterData;
              this.mapRange.set([rasterData.min, rasterData.max]);

              const raster = this.createRasterLayer(rasterData, colorScale!);
              leafletLayer = raster as unknown as L.Layer;

              let opacityEffect: EffectRef;

              // This untracked was already correct!
              untracked(() => {
                opacityEffect = effect(() => {
                  const opacity = this.mapOpacity();
                  if((raster as any).setOpacity) {
                    (raster as any).setOpacity(opacity / 100); 
                  }
                }, { injector: this.injector });
              });

              const onMapClick = (e: L.LeafletMouseEvent) => {
                if (!mapInstance.hasLayer(datasetLayerGroup)) return;
                const value = raster.geoPosToGridValue(e.latlng.lat, e.latlng.lng);
                if(!isNaN(value)) {
                  const displayValue = Number.isInteger(value) ? value : value.toFixed(2);
                  L.popup().setLatLng(e.latlng).setContent(`<b>Value:</b> ${displayValue}`).openOn(mapInstance);
                }
              };

              mapInstance.on('click', onMapClick);
              
              cleanupEvent = () => {
                mapInstance.off('click', onMapClick);
                if(opacityEffect) {
                  opacityEffect.destroy();
                }
              };
              
              break;
            }
          }

          if(leafletLayer) {
            datasetLayerGroup.addLayer(leafletLayer);
            this.layerControl.addOverlay(leafletLayer, label);

            onLayerCleanup(() => {
              cleanupEvent();
              datasetLayerGroup.removeLayer(leafletLayer!);
              this.layerControl.removeLayer(leafletLayer!);
            });
          }
        }, { injector: this.injector });
      });

      // Store the created effect so the outer loop can eventually destroy it
      createdEffects.push(layerEffectRef!);
    }

    return createdEffects;
  }

  createRasterLayer(rasterData: RasterData, colorScale: ColorScale): RasterLayer {
    return rasterLayer({
      colorScale: colorScale,
      data: rasterData,
      zIndex: 10
    });
  }
}