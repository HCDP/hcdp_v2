import { Service } from '@angular/core';
import { formatNumber } from "@angular/common"

@Service()
export class StationFormatHelper {
  private static readonly FORMAT: Record<string, {
      name: string,
      translate?: (value: any) => string
    }> = {
      skn: {
        name: "Station ID (SKN)"
      },
      name: {
        name: "Name"
      },
      observer: {
        name: "Observer"
      },
      network: {
        name: "Network"
      },
      island: {
        name: "Island",
        translate: (value: string) => {
          let trans: Record<string, string> = {
            BI: "Hawaiʻi",
            OA: "Oʻahu",
            MA: "Maui",
            KA: "Kauai",
            MO: "Molokaʻi",
            KO: "Kahoʻolawe",
            LA: "Lānaʻi"
          }
          return trans[value];
        }
      },
      value: {
        name: "Value",
        translate: (value: number) => {
          return formatNumber(value, navigator.language, "1.2-2");
        }
      },
      elevation_m: {
        name: "Elevation (m)",
        translate: (value: number) => {
          return formatNumber(value, navigator.language, "1.2-2");
        }
      },
      lat: {
        name: "Latitude",
        translate: (value: number) => {
          return formatNumber(value, navigator.language, "1.4-4");
        }
      },
      lng: {
        name: "Longitude",
        translate: (value: number) => {
          return formatNumber(value, navigator.language, "1.4-4");
        }
      },
      ncei_id: {
        name: "NCEI ID"
      },
      nws_id: {
        name: "NWS ID"
      },
      nesdis_id: {
        name: "NESDIS ID"
      },
      scan_id: {
        name: "Scan ID"
      },
      smart_node_rf_id: {
        name: "Smart Node RFID"
      }
    };
  
    getLabel(field: string) {
      return StationFormatHelper.FORMAT[field]?.name;
    }
  
    getFormattedValue(field: string, value: any) {
      let translationFunction = StationFormatHelper.FORMAT[field]?.translate;
      if(translationFunction) {
        return translationFunction(value);
      }
      return value;
    }
}
