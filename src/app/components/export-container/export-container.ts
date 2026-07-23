import { Component, computed, effect, inject, input, linkedSignal, signal, ChangeDetectionStrategy } from '@angular/core';
import { HCDPDatasetVisualization, HCDPVisSubtypes } from '../../models/datasets/dataset';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggle, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FileDetails, FilePropertyValue } from '../../models/datasets/recipe';
import { MatLabel } from '@angular/material/form-field';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ExportDataHandler, ExportTimeseriesDataHandler } from '../../models/datasets/export';
import { provideLuxonDateAdapter } from '@angular/material-luxon-adapter';
import { DateTime } from 'luxon';
import { ApiHandler } from '../../services/requests/api-handler';
import { firstValueFrom } from 'rxjs';
import { ExportGenerated } from '../../dialogs/export-generated/export-generated';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatetimeSelector } from '../controls/datetime-selector/datetime-selector';
import { ExportGlobalState } from '../../services/state/export-global-state';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-export-container',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatDividerModule,
    MatTooltipModule,
    MatLabel,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    DatetimeSelector,
    FormsModule
  ],
  providers: [
    provideLuxonDateAdapter()
  ],
  templateUrl: './export-container.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './export-container.scss',
})
export class ExportContainer {
  private readonly dialog = inject(MatDialog);
  private apiHandler = inject(ApiHandler);
  
  globalExportData = inject(ExportGlobalState);

  isGenerating = signal<boolean>(false);
  dataset = input.required<HCDPDatasetVisualization>();

  exportDataHandler = computed(() => {
    return (this.dataset() as HCDPVisSubtypes).exportData as ExportDataHandler;
  });

  exportDataConfig = computed(() => {
    return this.exportDataHandler().exportData;
  });

  hasDateControl = computed(() => {
    return this.dataset().type === "timeseries";
  });

  tsHandler = computed(() => {
    return this.hasDateControl() 
      ? (this.exportDataHandler() as ExportTimeseriesDataHandler) 
      : null;
  });

  startDate = linkedSignal<DateTime>(() => {
    return this.tsHandler()?.startDate ?? DateTime.now();
  });
  endDate = linkedSignal<DateTime>(() => {
    return this.tsHandler()?.endDate ?? DateTime.now();
  });


  constructor() {

    // Initialize the handler's state when the component mounts/dataset loads
    effect(() => {
      this.syncRequiredEmailState();
    });
  }

  // --- State Synchronization ---

  onEmailInput(newValue: string, isValid: boolean | null) {
    if(isValid) {
      this.globalExportData.email.set(newValue);
    }
  }

  private syncRequiredEmailState() {
    const handler = this.exportDataHandler();
    // If the max file count is exceeded, force sendToEmail to true in the handler
    if(handler.requireEmailExport()) {
      handler.sendToEmail = true;
    }
  }

  // --- Event Handlers ---

  onPropertyToggle(propertyId: string, valueId: string, source: MatButtonToggle, values: FilePropertyValue[]) {
    const isDeselecting = !source.checked;
    
    // Prevent last item from being toggled off
    if(isDeselecting && this.isPropertyLocked(propertyId, valueId, values)) {
      source.checked = true;
      return;
    }

    this.exportDataHandler().updateFilePropertyState(propertyId, valueId, source.checked);
    this.syncRequiredEmailState(); // Recalculate file limits
  }

  onFileToggle(file: FileDetails, isSelected: boolean) {
    const handler = this.exportDataHandler();
    
    // Update the selected file
    handler.updateFileSelect(file.id, isSelected);

    // If selected, automatically select all required files
    if(isSelected && file.requires && file.requires.length > 0) {
      for (const requiredId of file.requires) {
        handler.updateFileSelect(requiredId, true);
      }
    }
    
    this.syncRequiredEmailState(); // Recalculate file limits
  }

  // --- Dependency & Lock Logic ---

  isFileRequired(targetFileId: string): boolean {
    const config = this.exportDataConfig();
    const handler = this.exportDataHandler();

    for(const group of config.files) {
      for(const file of group.files) {
        // check if file is currently selected and it requires target file
        if(handler.checkFileSelected(file.id) && file.requires?.includes(targetFileId)) {
          return true;
        }
      }
    }
    
    return false;
  }

  isPropertyLocked(propertyId: string, valueId: string, values: FilePropertyValue[]): boolean {
    const handler = this.exportDataHandler();
    // If this specific value isn't currently selected, it shouldn't be locked
    if (!handler.checkPropertyState(propertyId, valueId)) {
      return false;
    }
    // Count how many total values are currently selected for this property
    const selectedCount = values.reduce((count, val) => {
      return count + (handler.checkPropertyState(propertyId, val.id) ? 1 : 0);
    }, 0);

    // Lock the toggle if it's the only one selected
    return selectedCount <= 1;
  }

  public canExport() {
    return this.globalExportData.licenseAck() && this.exportDataHandler().filesSelected() && (!this.exportDataHandler().requireEmailExport || this.exportDataHandler().sendToEmail);
  }


  // --- export data handlers ---

  public getExportPackageData() {
    let exportPackageData = this.exportDataHandler().getExportPackageGroupDetails();
    let data: any = {
      email: this.globalExportData.email(),
      data: [exportPackageData]
    };
    return data;
  }

  async export() {
    this.isGenerating.set(true);
    let data = this.getExportPackageData();
    await (this.exportDataHandler().sendToEmail ? this.generateEmailRequest(data) : this.generateAndDownload(data));
    this.isGenerating.set(false);
  }

  async generateAndDownload(payload: any) {
    // necessary to use splitlink?
    // try direct content ep for now
    const ep = "/genzip/instant/content";

    let data: ArrayBuffer | null = null;

    let message = "Your download package has been generated. Check your browser for the downloaded file.";
    try {
      data = await firstValueFrom<ArrayBuffer>(this.apiHandler.post(ep, payload, {
      responseType: "arraybuffer"
    }));
    }
    catch(error) {
      message = "An error occurred while generating you export request. Please try again later. If this error persists please contact the site administrators at hcdp@hawaii.edu";
    }

    this.openExportDialog(message);
    if(data) {
      this.triggerBrowserDownload(data);
    }

    
  }

  async generateEmailRequest(payload: any) {
    const ep = "/genzip/email";
    let message = `A download request has been generated. You should receive an email at ${this.globalExportData.email()} with your download package shortly. If you do not receive an email within 4 hours, please ensure the email address you entered is spelled correctly and try again or contact the site administrators at hcdp@hawaii.edu.`;
    try {
      await firstValueFrom<string>(this.apiHandler.post(ep, payload, {
        responseType: "text"
      }));
    }
    catch(error) {
      message = "An error occurred while generating you export request. Please try again later. If this error persists please contact the site administrators at hcdp@hawaii.edu";
    }
    this.openExportDialog(message);
  }

  openExportDialog(message: string) {
    this.dialog.open(ExportGenerated, { data: message });
  }

  private triggerBrowserDownload(data: ArrayBuffer) {
    const blob = new Blob([data], { type: 'application/zip' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'hcdp_export.zip'; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}