import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Configuration } from '../configuration/configuration';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, retry, Subject, Subscription, switchMap } from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class ApiHandler {
  private http = inject(HttpClient);
  private readonly API_ID = "hcdp_api";
  private url: string;

  configManager = inject(Configuration);
  header: HttpHeaders;

  constructor() {
    const {token, url} = this.configManager.api(this.API_ID);
    this.header = new HttpHeaders()
      .set("Authorization", `Bearer ${token}`);
    // remove trailing slashes
    this.url = url.replace(/\/+$/, '');
  }

  private buildUrl(endpoint: string): string {
    // remove leading slashes from the endpoint
    const path = endpoint.replace(/^\/+/, '');
    return `${this.url}/${path}`;
  }


  public get<T>(endpoint: string, params?: RequestParams) {
    return this.http.get<T>(`${this.buildUrl(endpoint)}`, { 
      headers: this.header,
      params
    }).pipe(
      retry(3)
    );
  }

  public createExclusiveDataStream<T>() {
    // return an APIStream object
    return new APIStream<T>((source: APISource): Observable<RequestData<T>> => {
      const { endpoint, params } = source;
      
      return this.get<T>(endpoint, params).pipe(
        // map successful responses
        map(data => ({
          success: true,
          data: data
        })),
        // map errors
        catchError((e: HttpErrorResponse) => {
          console.error(`Request failed:`, e.message);
          return of({
            success: false,
            error: e
          });
        })
      );
    });
  }
}


export class APIStream<T> {
  private stream = new Subject<APISource>();
  private subscription: Subscription;
  
  // WritableSignal to report request data stream, initialize to null
  private dataSignal: WritableSignal<RequestData<T> | null> = signal<RequestData<T> | null>(null);

  // readonly exposed version
  public data = this.dataSignal.asReadonly();

  constructor(cb: (source: APISource) => Observable<RequestData<T>>) {
    // subscribe to the data stream
    this.subscription = this.stream.pipe(
      // switchMap will automatically unsubscribe and cancel old requests when a new one comes through
      switchMap(cb)
    ).subscribe((response) => {
      // update the signal with request response
      this.dataSignal.set(response);
    });
  }

  // get next value from the api with source
  public next(source: APISource) {
    this.stream.next(source);
  }

  public close() {
    this.stream.complete();
    this.subscription.unsubscribe();
  }
}

export type RequestParams = Record<string, string | number | boolean>;

export interface APISource {
  endpoint: string,
  params?: RequestParams
}

export interface RequestData<T> {
  success: boolean,
  data?: T,
  error?: HttpErrorResponse
}