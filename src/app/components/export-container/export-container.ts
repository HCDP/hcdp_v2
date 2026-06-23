import { Component, computed, effect, inject, input, signal } from '@angular/core';
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
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { ExportDataHandler, ExportTimeseriesDataHandler } from '../../models/datasets/export';
import { MatCalendarHeader, MatCalendarView, MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { provideLuxonDateAdapter } from '@angular/material-luxon-adapter';
import { DateTime } from 'luxon';
import { ApiHandler } from '../../services/requests/api-handler';
import { firstValueFrom } from 'rxjs';
import { ExportGenerated } from '../../dialogs/export-generated/export-generated';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    ReactiveFormsModule,
    MatDatepickerModule,
    MatProgressSpinnerModule
  ],
  providers: [
    provideLuxonDateAdapter()
  ],
  templateUrl: './export-container.html',
  styleUrl: './export-container.scss',
})
export class ExportContainer {
  private apiHandler = inject(ApiHandler);
  private readonly dialog = inject(MatDialog);

  isGenerating = signal(false);

  // NEED TO UNWRAP STATE CONTROL FROM BASIC TIMESERIES DATA SO CAN REUSE
  // BASE DATETIME SELECTOR SHOULD NOT USE INTERNAL STATE SO CAN REUSE
  // for now use custom version of date selector, but should be able to use date time selector component here too (state control should be in control wrapper)

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

  emailControl = new FormControl('', [Validators.required, Validators.email]);

  constructor() {
    //override the confusing default method that switches to random things and make it go up one level
    MatCalendarHeader.prototype.currentPeriodClicked = function () {
      switch(this.calendar.currentView) {
        case "year": {
          this.calendar.currentView = "multi-year";
          break;
        }
        case "month": {
          this.calendar.currentView = "year";
        }
      }
    };

    // Keep the handler's state synced with the reactive form control
    this.emailControl.valueChanges.subscribe(() => {
      this.syncEmailState();
    });

    // Initialize the handler's state when the component mounts/dataset loads
    effect(() => {
      this.syncEmailState();
      this.syncRequiredEmailState();
    });
  }

  // --- State Synchronization ---

  private syncEmailState() {
    const handler = this.exportDataHandler();
    if (handler) {
      handler.email = this.emailControl.value || '';
      handler.emailIsValid = this.emailControl.valid;
    }
  }

  private syncRequiredEmailState() {
    const handler = this.exportDataHandler();
    // If the max file count is exceeded, force sendToEmail to true in the handler
    if (handler && handler.requireEmailExport()) {
      handler.sendToEmail = true;
    }
  }

  // --- Event Handlers ---

  onPropertyToggle(propertyId: string, valueId: string, source: MatButtonToggle, values: FilePropertyValue[]) {
    const isDeselecting = !source.checked;
    
    // Prevent last item from being toggled off
    if (isDeselecting && this.isPropertyLocked(propertyId, valueId, values)) {
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
    if (isSelected && file.requires && file.requires.length > 0) {
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

    for (const group of config.files) {
      for (const file of group.files) {
        // If a file is currently selected AND it requires our target file
        if (handler.checkFileSelected(file.id) && file.requires?.includes(targetFileId)) {
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

  get tsHandler(): ExportTimeseriesDataHandler | null {
    return this.hasDateControl() 
      ? (this.exportDataHandler() as ExportTimeseriesDataHandler) 
      : null;
  }


  // --- Timeseries / Date Logic ---

  // Helper getter to safely cast and access timeseries specific methods
  onStartDateChange(event: any) {
    if(this.tsHandler && event.value) {
      this.tsHandler.updateStartDateState(event.value);
      this.syncRequiredEmailState(); // Recalculate file limits!
    }
  }

  onEndDateChange(event: any) {
    if(this.tsHandler && event.value) {
      this.tsHandler.updateEndDateState(event.value);
      this.syncRequiredEmailState(); // Recalculate file limits!
    }
  }


  getDefaultView(): MatCalendarView {
    let period = this.tsHandler!.periodUnit;
    switch(period) {
      case "year": {
        return "multi-year";
      }
      case "month": {
        return "year";
      }
      default: {
        return "month";
      }
    }
  }

  viewManager(view: 'month' | 'year', date: DateTime, picker: MatDatepicker<DateTime>, type: 'start' | 'end') {
    const tsHandler = this.tsHandler;
    if (!tsHandler) return;

    const currentUnit = tsHandler.periodUnit; // e.g., 'month' or 'year'

    // If the calendar view exactly matches the dataset's resolution
    if (view === currentUnit) {
      
      // Update the correct date state
      if (type === 'start') {
        tsHandler.updateStartDateState(date);
      } else {
        tsHandler.updateEndDateState(date);
      }

      // Recalculate files for the email requirement logic
      this.syncRequiredEmailState();
      
      // Close the picker so the user doesn't have to drill down further
      picker.close();
    }
  }



  // --- export data handlers ---

  async export() {
    this.isGenerating.set(true);
    let data = this.exportDataHandler().getExportPackageData();
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
    let message = `A download request has been generated. You should receive an email at ${this.exportDataHandler().email} with your download package shortly. If you do not receive an email within 4 hours, please ensure the email address you entered is spelled correctly and try again or contact the site administrators at hcdp@hawaii.edu.`;
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