import { DateTime } from "luxon";
import { ExportData } from "./recipe";
import { HCDPTimeseriesData } from "./timeseries";

export class ExportDataHandler {
  private static readonly IN_SITE_EXPORT_MAX = 150;

  protected _exportData: ExportData;

  private _filePropertyState: Record<string, Set<string>>;
  private _fileSelectState: Set<string>;
  private _datasetParams: Record<string, string>;
  private _sendToEmail: boolean;

  constructor(exportData: ExportData, datasetParams: Record<string, string>) {
    this._exportData = exportData;
    this._datasetParams = datasetParams;
    this._sendToEmail = false;
    this._fileSelectState = new Set<string>();
    this._filePropertyState = {};
    for(let group of exportData.files) {
      for(let property of group.properties) {
        this._filePropertyState[property.id] = new Set<string>(property.defaults);
      }
    }
  }

  get exportData(): ExportData {
    return JSON.parse(JSON.stringify(this._exportData));
  }

  public checkPropertyState(propertyId: string, value: string) {
    return this._filePropertyState[propertyId].has(value);
  }

  public updateFilePropertyState(propertyId: string, value: string, select: boolean) {
    if(select) {
      this._filePropertyState[propertyId].add(value);
    }
    else {
      this._filePropertyState[propertyId].delete(value);
    }
  }

  public checkFileSelected(fileId: string) {
    return this._fileSelectState.has(fileId);
  }

  public updateFileSelect(fileId: string, select: boolean) {
    if(select) {
      this._fileSelectState.add(fileId);
    }
    else {
      this._fileSelectState.delete(fileId)
    }
  }

  public filesSelected(): boolean {
    return this._fileSelectState.size > 0;
  }

  protected estimateNumFiles() {
    let numFiles = 0;
    for(let group of this._exportData.files) {
      let groupProps = 0;
      let groupFiles = 0
      for(let property of group.properties) {
        let numProps = this._filePropertyState[property.id].size;
        groupProps += numProps;
      }
      for(let file of group.files) {
        if(this._fileSelectState.has(file.id)) {
          groupFiles++;
        }
      }
      numFiles += groupProps * groupFiles;
    }
    return numFiles;
  }

  public requireEmailExport() {
    let numFiles = this.estimateNumFiles();

    return numFiles > ExportDataHandler.IN_SITE_EXPORT_MAX;
  }

  
  // --- sendToEmail ---
  get sendToEmail(): boolean {
    return this._sendToEmail;
  }

  set sendToEmail(value: boolean) {
    this._sendToEmail = value;
  }



  public getExportPackageGroupDetails() {
    let data: any = {
      fileData: [],
      params: this._datasetParams
    };

    for(let group of this._exportData.files) {
      let fileParams: Record<string, string[]> = {};
      let files = [];
      // get properties for this group
      for(let property of group.properties) {
        let values = [...this._filePropertyState[property.id]];
        fileParams[property.fieldTag] = values;
      }
      for(let file of group.files) {
        // if file is selected
        if(this._fileSelectState.has(file.id)) {
          // add any static params to the params set
          for(let param in file.fileParams) {
            if(fileParams[param] === undefined) {
              fileParams[param] = [];
            }
            fileParams[param].push(file.fileParams[param]);
          }
          // add file tag to files array for this group
          files.push(file.fileTag);
        }
      }
      if(files.length > 0) {
        data.fileData.push({
          fileParams,
          files
        });
      }
      
    }
    return data;
  }

}





export class ExportTimeseriesDataHandler extends ExportDataHandler {
  private _timeseriesData: HCDPTimeseriesData;

  private _dateState: {
    start: DateTime,
    end: DateTime
  }


  constructor(exportData: ExportData, datasetParams: Record<string, string>, timeseriesData: HCDPTimeseriesData) {
    super(exportData, datasetParams);
    this._timeseriesData = timeseriesData;

    this._dateState = {
      start: timeseriesData.start,
      end: timeseriesData.end
    }
  }

  get startDate() { 
    return this._timeseriesData.start;
  }

  get endDate() {
    return this._timeseriesData.end;
  }

  get period() {
    return this._timeseriesData.period;
  }

  
  public checkStartDateState() {
    return this._dateState.start;
  }

  public updateStartDateState(date: DateTime) {
    this._dateState.start = date;
  }

  public checkEndDateState() {
    return this._dateState.end;
  }

  public updateEndDateState(date: DateTime) {
    this._dateState.end = date;
  }


  // Overrides

  protected override estimateNumFiles(): number {
    let unit = this._timeseriesData.period.unit;
    let interval = this._timeseriesData.period.interval;
    let numPeriods = this._dateState.end.diff(this._dateState.start, unit).get(unit);
    numPeriods /= interval;
    let numFilesPerPeriod = super.estimateNumFiles();
    return numPeriods * numFilesPerPeriod;
  }

  public override getExportPackageGroupDetails() {
    let data = super.getExportPackageGroupDetails();
    let periodData = this._timeseriesData.period;
    let {unit, interval} = periodData;
    let start = periodData.formatDate(this._dateState.start);
    let end = periodData.formatDate(this._dateState.end);
    data.dates = {
      start,
      end,
      unit,
      interval 
    }
    return data;
  }
}