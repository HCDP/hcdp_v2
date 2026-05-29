import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { TabBase } from "../tab-base/tab-base";
import { LocationSelector } from '../../controls/location-selector/location-selector';

// Define the interface for our test data
export interface LocationData {
  id: number;
  name: string;
  city: string;
  state: string;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-locations',
  imports: [MatTableModule, MatSortModule, LocationSelector],
  templateUrl: './locations.html',
  styleUrl: './locations.scss',
})
export class Locations extends TabBase implements OnInit, AfterViewInit {
  // Define the columns to be displayed in the order they should appear
  displayedColumns: string[] = ['id', 'name', 'city', 'state', 'status'];
  
  // Initialize the MatTableDataSource with our interface
  dataSource = new MatTableDataSource<LocationData>();

  // Get a reference to the MatSort instance from the DOM
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    // Populate with mockup test data
    this.dataSource.data = [
      { id: 1, name: 'Headquarters', city: 'Austin', state: 'TX', status: 'Active' },
      { id: 2, name: 'East Coast Hub', city: 'Boston', state: 'MA', status: 'Active' },
      { id: 3, name: 'West Coast Lab', city: 'San Francisco', state: 'CA', status: 'Active' },
      { id: 4, name: 'Midwest Logistics', city: 'Chicago', state: 'IL', status: 'Inactive' },
      { id: 5, name: 'Southern Branch', city: 'Miami', state: 'FL', status: 'Active' },
      { id: 6, name: 'Pacific Northwest Center', city: 'Seattle', state: 'WA', status: 'Inactive' },
      { id: 7, name: 'Desert Outpost', city: 'Phoenix', state: 'AZ', status: 'Active' },
      { id: 8, name: 'Rocky Mountain Office', city: 'Denver', state: 'CO', status: 'Active' },
    ];
  }

  ngAfterViewInit(): void {
    // Link the sorting mechanism to the data source after the view initializes
    this.dataSource.sort = this.sort;
  }
}