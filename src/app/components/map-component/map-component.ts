import { afterNextRender, Component, computed, effect, ElementRef, inject, Injector, input, signal, viewChild, untracked, EffectRef, ResourceRef } from '@angular/core';
import * as L from "leaflet";
import { LeafletCompassRose, RoseControlOptions } from "../controls/leaflet/leaflet-compass-rose/leaflet-compass-rose";
import { LeafletImageExport } from '../controls/leaflet/leaflet-image-export/leaflet-image-export';
import { AssetManager } from '../../services/util/asset-manager';
import { HCDPDatasetVisualization, HCDPVisSubtypes } from '../../models/datasets/dataset';
import { LeafletColorScale } from '../controls/leaflet/leaflet-color-scale/leaflet-color-scale';
import { RasterData } from '../../models/leaflet/rasterData';
import { ColorScale } from '../../models/leaflet/colors';
import { HCDPStationDataManager, StationData } from '../../models/datasets/stations';
import { rasterLayer, RasterLayer } from '../../models/leaflet/rasterLayer';
import { MatSliderModule } from '@angular/material/slider';
import { Spinner } from 'spin.js';
import { LayerData } from '../../models/datasets/recipe';
import { MapLocation } from '../../models/datasets/locationManager';
import { DataStreamManager } from '../../models/datasets/dataStreams';

@Component({
  selector: 'app-map-component',
  imports: [LeafletCompassRose, LeafletImageExport, LeafletColorScale, MatSliderModule],
  templateUrl: './map-component.html',
  styleUrl: './map-component.scss',
})
export class MapComponent {
  private injector = inject(Injector);
  private assetService = inject(AssetManager);

  imageContainer = input.required<ElementRef>();
  dataset = input.required<HCDPDatasetVisualization>();
  typedDataset = computed(() => {
    return this.dataset() as HCDPVisSubtypes;
  });
  tabManager = computed(() => {
    return this.dataset().tabManager;
  });

  readonly isSpinning = computed(() => {
    const dataset = this.typedDataset();
    if(!dataset || !dataset.dataStreams) return false;

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
  private layerControl!: L.Control.Layers;

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

    effect((onCleanup) => {
      const element = this.imageContainer().nativeElement;
      let invalidateSizeThrottle: number;
      const resizeObserver = new ResizeObserver(() => {
        clearTimeout(invalidateSizeThrottle);
        invalidateSizeThrottle = setTimeout(() => {
          this.invalidateSize();
        }, 100);
      });
      resizeObserver.observe(element);
      onCleanup(() => {
        resizeObserver.disconnect();
      });
    });


    // Dataset streams tracking effect
    effect((onDatasetCleanup) => {
      if(!this.map()) return;

      let map = this.map()!;
      const datasetLayerGroup = L.layerGroup().addTo(map);
      let isCancelled = false;

      // --- Hover Effect State & Utilities ---
      let hoverTimeout: any;
      let hoverHighlightLayer: L.Layer | null = null;
      let hoverTooltip: L.Tooltip | null = null;

      const clearHoverEffect = () => {
        if(hoverTimeout) clearTimeout(hoverTimeout);
        if(hoverHighlightLayer) {
          map.removeLayer(hoverHighlightLayer);
          hoverHighlightLayer = null;
        }
        if(hoverTooltip) {
          map.removeLayer(hoverTooltip);
          hoverTooltip = null;
        }
      };

      // --- Map Mouse Event Listeners ---
      let lastHoverLatLng: L.LatLng | null = null;

      const onMapMouseMove = (e: L.LeafletMouseEvent) => {
        if(lastHoverLatLng && e.latlng.distanceTo(lastHoverLatLng) < 5) {
          return; 
        }
        lastHoverLatLng = e.latlng;

        const mapContainer = map.getContainer();
        let hasDataUnderCursor = false;
        let activeRasterLayer: any = null;

        clearHoverEffect();

        // Check ifhovering over a Leaflet marker/shape
        const isOverInteractiveLayer = (e.originalEvent.target as HTMLElement)
          .classList.contains('leaflet-interactive');

        if(isOverInteractiveLayer) {
          hasDataUnderCursor = true;
        } else {
          // Check raster data matrix
          datasetLayerGroup.eachLayer((layer: any) => {
            if(layer.geoPosToGridValue) {
              const value = layer.geoPosToGridValue(e.latlng.lat, e.latlng.lng);
              if(!isNaN(value)) {
                hasDataUnderCursor = true;
                activeRasterLayer = layer;
              }
            }
          });
        }

        if(hasDataUnderCursor) {
          mapContainer.classList.add('map-crosshair-cursor');

          hoverTimeout = setTimeout(() => {
            
            if(activeRasterLayer) {
              const value = activeRasterLayer.geoPosToGridValue(e.latlng.lat, e.latlng.lng);
              const displayValue = Number.isInteger(value) ? value : value.toFixed(2);

              hoverTooltip = L.tooltip({
                permanent: true,     
                direction: 'top',    
                className: 'transient-hover-popup',
                interactive: false,
                opacity: 0.95
              })
              .setLatLng(e.latlng)
              .setContent(`<div style="padding: 2px 4px; font-weight: bold;">Value: ${displayValue}</div>`)
              .addTo(map); 

              if(activeRasterLayer.getCellBoundsFromGeoPos) {
                const cellBounds = activeRasterLayer.getCellBoundsFromGeoPos(e.latlng);
                
                if(cellBounds) {
                  hoverHighlightLayer = L.rectangle(cellBounds, {
                    fillColor: "orange",
                    weight: 3,
                    opacity: 1,
                    color: "orange",
                    fillOpacity: 0.2,
                    interactive: false
                  }).addTo(map);
                }
              }
            }
          }, 1000);

        } else {
          mapContainer.classList.remove('map-crosshair-cursor');
        }
      };

      const onMapMouseOut = () => clearHoverEffect();

      // Attach the listeners to the map
      map.on('mousemove', onMapMouseMove);
      map.on('mouseout', onMapMouseOut);

      // --- Stream Handling ---
      const childEffects = this.handleDatasetStreams(map, datasetLayerGroup, () => isCancelled);

      // --- Complete Cleanup ---
      onDatasetCleanup(() => {
        isCancelled = true;
        
        // 1. Wipe hover interactions and unbind map listeners
        clearHoverEffect();
        map.off('mousemove', onMapMouseMove);
        map.off('mouseout', onMapMouseOut);
        map.getContainer().classList.remove('map-crosshair-cursor');
        
        // 2. Destroy layers and child stream effects
        map.removeLayer(datasetLayerGroup);
        childEffects.forEach(eRef => eRef?.destroy());
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





  private handleDataLayer(dataStreamsManager: DataStreamManager, layer: LayerData, mapInstance: L.Map, datasetLayerGroup: L.LayerGroup) {
    let { stream, label } = layer;
    let type = dataStreamsManager.getStreamType(stream);
    let dataStream = dataStreamsManager.getStream(stream);

    let layerEffectRef: EffectRef;

    untracked(() => {
      layerEffectRef = effect((onLayerCleanup) => {
        const data = dataStream.value();
        const colorScale = this.activeColorScale();

        if(!data || !colorScale) return;

        let layerData: {
            cleanupEvent: () => void;
            leafletLayer: L.Layer;
        };
        switch(type) {
          case "stations": {
            layerData = this.handleStationLayer(data, colorScale, mapInstance);
            break;
          }
          case "raster": {
            layerData = this.handleRasterLayer(data, colorScale, mapInstance);
            break
          }
          default: {
            return;
          }
        }

        const { leafletLayer, cleanupEvent } = layerData;

        datasetLayerGroup.addLayer(leafletLayer);
        this.layerControl.addOverlay(leafletLayer, label);

        onLayerCleanup(() => {
          cleanupEvent();
          datasetLayerGroup.removeLayer(leafletLayer);
          this.layerControl.removeLayer(leafletLayer);
        });
      }, { injector: this.injector });
    });
    return layerEffectRef!;
  }


  private handleRasterLayer(data: RasterData, colorScale: ColorScale, mapInstance: L.Map) {
    this.mapRange.set([data.min, data.max]);

    const leafletLayer = rasterLayer({
      colorScale,
      data,
      zIndex: 10
    });

    let opacityEffect: EffectRef;
    let currentHighlight: L.Layer | null = null;

    untracked(() => {
      opacityEffect = effect(() => {
        const opacity = this.mapOpacity();
        leafletLayer.setOpacity(opacity / 100); 
      }, { injector: this.injector });
    });

    // 1. Map -> App Synchronization
    const onMapClick = (e: L.LeafletMouseEvent | any) => {
      const value = leafletLayer.geoPosToGridValue(e.latlng.lat, e.latlng.lng);
      if(isNaN(value)) {
        return; 
      }
      
      this.typedDataset().locationManager.selectLocation("map", { lat: e.latlng.lat, lng: e.latlng.lng });
    };

    mapInstance.on('click', onMapClick);
    
    // 2. App -> Map Synchronization
    let selectionEffect: EffectRef;
    untracked(() => {
      selectionEffect = effect(() => {
        const selectedLoc = this.typedDataset().locationManager.location();
        
        // Clear the previous highlight box ifit exists
        if(currentHighlight) {
          mapInstance.removeLayer(currentHighlight);
          currentHighlight = null;
        }

        if(selectedLoc?.type === "map") {
          const mapLocation = selectedLoc.location as MapLocation;
          const { lat, lng } = mapLocation;
          
          const value = leafletLayer.geoPosToGridValue(lat, lng);
          
          if(!isNaN(value)) {
            mapInstance.flyTo([lat, lng], mapInstance.getZoom(), {
              animate: true,
              duration: 0.75
            });

            const cellBounds = leafletLayer.getCellBoundsFromGeoPos(L.latLng(lat, lng));
            if(cellBounds) {
              currentHighlight = L.rectangle(cellBounds, {
                fillColor: "black",
                weight: 3,
                opacity: 1,
                color: "black",
                fillOpacity: 0.2,
                interactive: false
              }).addTo(mapInstance);
            }

            const displayValue = Number.isInteger(value) ? value : value.toFixed(2);


            let popupContent = `
              <b>Value:</b> ${displayValue}<br>
              <small style="color: #666;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</small>
            `;
            let popupContainer = this.createPopupContainer(popupContent);
            L.popup({ autoPan: false })
              .setLatLng([lat, lng])
              .setContent(popupContainer) 
              .openOn(mapInstance);


          }
          else {
            mapInstance.closePopup();
          }
        }
      }, { injector: this.injector });
    });

    // 3. Clear the box ifthe user manually closes the popup
    const onPopupClose = () => {
      if(currentHighlight) {
        mapInstance.removeLayer(currentHighlight);
        currentHighlight = null;
      }
    };
    mapInstance.on('popupclose', onPopupClose);
    
    let cleanupEvent = () => {
      mapInstance.off('click', onMapClick);
      mapInstance.off('popupclose', onPopupClose);
      if(currentHighlight) {
        mapInstance.removeLayer(currentHighlight);
      }
      if(opacityEffect) opacityEffect.destroy();
      if(selectionEffect) selectionEffect.destroy();
    };

    return {
      cleanupEvent,
      leafletLayer: leafletLayer as L.Layer
    }
  }


  private handleStationLayer(data: HCDPStationDataManager, colorScale: ColorScale, mapInstance: L.Map) {
    const stations: StationData[] = data.filteredStations();
    const stationGroup = L.featureGroup();
    
    const markerMap = new Map<string, L.CircleMarker>();

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
      const marker = L.circleMarker([station.lat, station.lng], {
        radius,
        fillColor: markerColor,
        color: '#000',
        weight,
        opacity: 1,
        fillOpacity: 1
      });

      // Set up the popup content
      const popupContent = `<b>${station.name || 'Station ' + station.skn}</b><br/>SKN: ${station.skn}<br/>Value: ${station.value.toFixed(2)}`;
      let popupContainer = this.createPopupContainer(popupContent);
      
      // Disable autoPan so the popup opening doesn't interrupt flyTo
      marker.bindPopup(popupContainer, { autoPan: false });

      // Map -> App synchronization
      marker.on('click', () => {
        this.typedDataset().locationManager.selectLocation("station", station);
      });

      markerMap.set(station.skn, marker);
      stationGroup.addLayer(marker);
    });

    let leafletLayer = stationGroup;

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

    // App -> Map synchronization
    let selectionEffect: EffectRef;
    untracked(() => {
      selectionEffect = effect(() => {
        const selectedLoc = this.typedDataset().locationManager.location();
        
        if(selectedLoc?.type === "station") {
          const stationData = selectedLoc.location as StationData;
          const marker = markerMap.get(stationData.skn);
          
          if(marker) {
            // flyTo prevents snapping and guarantees smooth animation.
            mapInstance.flyTo(
              [stationData.lat, stationData.lng], 
              mapInstance.getZoom(), 
              {
                animate: true,
                duration: 0.75 
              }
            );
            marker.openPopup();
          }
        } else {
          mapInstance.closePopup();
        }
      }, { injector: this.injector });
    });

    let cleanupEvent = () => {
      mapInstance.off("zoomend", onZoomEnd);
      if(selectionEffect) {
        selectionEffect.destroy();
      }
    };

    return {
      cleanupEvent,
      leafletLayer: leafletLayer as L.Layer
    }
  }






  private handleDatasetStreams(mapInstance: L.Map, datasetLayerGroup: L.LayerGroup, isCancelled: () => boolean): EffectRef[] {
    const dataStreamsManager = this.typedDataset().dataStreams;
    if(isCancelled()) return [];

    const { layers } = this.typedDataset().mapState;
    this.mapOpacity.set(this.typedDataset().mapState.opacity);

    const createdEffects: EffectRef[] = [];

    for(let layer of layers) {
      const layerEffectRef = this.handleDataLayer(dataStreamsManager, layer, mapInstance, datasetLayerGroup)
      createdEffects.push(layerEffectRef);
    }

    return createdEffects;
  }



  createPopupContainer(content: string) {
    const popupContainer = document.createElement('div');

    if(this.tabManager().hasTab("timeseries")) {
      content += `
        <hr>
        <a href="javascript:void(0);" class="timeseries-link">
          View Timeseries
        </a>
      `;
    }

    popupContainer.innerHTML = content;

    const linkElement = popupContainer.querySelector('.timeseries-link');
    if(linkElement) {
      linkElement.addEventListener('click', (e) => {
        e.preventDefault();
        this.tabManager().tab = "timeseries";
      });
    }

    return popupContainer;
  }
}