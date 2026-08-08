import { afterNextRender, Component, computed, effect, ElementRef, inject, Injector, input, signal, viewChild, untracked, EffectRef, ResourceRef, ChangeDetectionStrategy } from '@angular/core';
import * as L from "leaflet";
import { LeafletCompassRose, RoseControlOptions } from "../controls/leaflet/leaflet-compass-rose/leaflet-compass-rose";
import { LeafletImageExport } from '../controls/leaflet/leaflet-image-export/leaflet-image-export';
import { AssetManager } from '../../services/util/asset-manager';
import { HCDPDatasetVisualization, HCDPVisSubtypes } from '../../models/datasets/dataset';
import { LeafletColorScale } from '../controls/leaflet/leaflet-color-scale/leaflet-color-scale';
import { RasterData } from '../../models/leaflet/rasterData';
import { ColorScale } from '../../models/leaflet/colors';
import { HCDPStationDataManager, StationData } from '../../models/datasets/stations';
import { RasterLayer, rasterLayer } from '../../models/leaflet/rasterLayer';
import { MatSliderModule } from '@angular/material/slider';
import { Spinner } from 'spin.js';
import { LayerData } from '../../models/datasets/recipe';
import { MapLocation } from '../../models/datasets/locationManager';
import { DataStreamManager } from '../../models/datasets/dataStreams';
import { Configuration } from '../../services/configuration/configuration';
import { LeafletHeader } from '../controls/leaflet/leaflet-header/leaflet-header';
import { FormsModule } from '@angular/forms';
import { ThrottleHandler } from '../../models/util/util';
import { ExperimentalBanner } from '../controls/experimental-banner/experimental-banner';

@Component({
  selector: 'app-map-component',
  imports: [LeafletHeader, LeafletCompassRose, LeafletImageExport, LeafletColorScale, MatSliderModule, FormsModule, ExperimentalBanner],
  templateUrl: './map-component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './map-component.scss',
})
export class MapComponent {
  private injector = inject(Injector);
  private assetService = inject(AssetManager);
  private config = inject(Configuration);

  private resizeThrottle = new ThrottleHandler(100);
  private opacityThrottle = new ThrottleHandler(50, true);

  imageContainer = input.required<ElementRef>();
  dataset = input.required<HCDPDatasetVisualization>();
  typedDataset = computed(() => {
    return this.dataset() as HCDPVisSubtypes;
  });
  tabManager = computed(() => {
    return this.dataset().tabManager;
  });

  valueLabel = computed(() => {
    return this.typedDataset().valueLabel();
  });

  isExperimental = computed(() => {
    return !!this.typedDataset().warnings?.experimental;
  });

  headerLabel = computed(() => {
    return this.dataset().label;
  });

  headerSublabel = computed(() => {
    let dateControl = this.typedDataset().dataState.getControl("date");
    if(dateControl) {
      return dateControl.stringValue;
    }
    return undefined;
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

  private baseLayers: {[label: string]: L.TileLayer};
  private layerControl!: L.Control.Layers;

  map = signal<L.Map | undefined>(undefined);
  roseOptions: RoseControlOptions;
  imageHiddenControls = ["leaflet-control-zoom", "leaflet-control-layers", "leaflet-control-export", "color-scale-config-btn"];

  constructor() {
    this.baseLayers = {
      "Satellite (Google)": L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom: 20, zIndex: 1 }),
      "Street (Google)": L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 20, zIndex: 1 }),
      "World Imagery (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, zIndex: 1 }),
      "USGS Topo (USGS)": L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, zIndex: 1 }),
      "Shaded Relief (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', { maxZoom: 13, zIndex: 1 })
    };

    let roseImage = "/images/hcdp_compass_rose.png";
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
      
      const resizeObserver = new ResizeObserver(() => {
        this.resizeThrottle.run(this.invalidateSize.bind(this));
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
        
        // Wipe hover interactions and unbind map listeners
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


  private initMap(): void {
    const map = L.map(this.mapElement().nativeElement, {
      layers: [this.baseLayers["Satellite (Google)"]],
      zoom: this.config.defaultZoom,
      center: this.config.mapCenter,
      attributionControl: false,
      minZoom: this.config.minZoom,
      maxBounds: this.config.mapBounds
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

  private setOpacity(layer: RasterLayer, opacity: number) {
    layer.setOpacity(opacity / 100);
    this.typedDataset().mapState.opacity = opacity;
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
        this.opacityThrottle.run(() => {
          this.setOpacity(leafletLayer, opacity);
        });
        
      }, { injector: this.injector });
    });

    // Map -> App Synchronization
    const onMapClick = (e: L.LeafletMouseEvent | any) => {
      const value = leafletLayer.geoPosToGridValue(e.latlng.lat, e.latlng.lng);
      if(isNaN(value)) {
        return; 
      }
      
      this.typedDataset().locationManager.selectLocation("map", { lat: e.latlng.lat, lng: e.latlng.lng });
    };

    mapInstance.on('click', onMapClick);
    
    // App -> Map Synchronization
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
          else if(!selectedLoc) {
            mapInstance.closePopup();
          }
        }
      }, { injector: this.injector });
    });

    // Clear the box if the user manually closes the popup
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
      const { metadata, value } = station;
      const { lat, lng, name, skn } = metadata;
      const marker = L.circleMarker([lat, lng], {
        radius,
        fillColor: markerColor,
        color: '#000',
        weight,
        opacity: 1,
        fillOpacity: 1
      });

      // Set up the popup content
      const popupContent = `<b>${name || 'Station ' + skn}</b><br/>SKN: ${skn}<br/>Value: ${value.toFixed(2)}`;
      let popupContainer = this.createPopupContainer(popupContent);
      
      // Disable autoPan so the popup opening doesn't interrupt flyTo
      marker.bindPopup(popupContainer, { autoPan: false });

      // Map -> App synchronization
      marker.on('click', () => {
        this.typedDataset().locationManager.selectLocation("station", metadata);
      });

      markerMap.set(skn, marker);
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
          const stationMetadata = selectedLoc.location;
          const marker = markerMap.get(stationMetadata.skn);
          
          if(marker) {
            // flyTo prevents snapping and guarantees smooth animation.
            mapInstance.flyTo(
              [stationMetadata.lat, stationMetadata.lng], 
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