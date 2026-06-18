import { inject, Injectable } from '@angular/core';
import { Configuration } from '../configuration/configuration';
import { HttpHeaders, HttpClient, HttpContext, HttpParams, HttpResponse, HttpEvent } from '@angular/common/http';
import { Observable, of, retry, shareReplay, switchMap, tap } from "rxjs";
import { Params } from '@angular/router';

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


  public get<T>(endpoint: string, options: HttpOptions & { observe: 'events' }): Observable<HttpEvent<T>>;
  public get<T>(endpoint: string, options: HttpOptions & { observe: 'response' }): Observable<HttpResponse<T>>;
  public get<T>(endpoint: string, options?: HttpOptions): Observable<T>;
  public get<T>(endpoint: string, options: HttpOptions = {}) {
    // clone to prevent modifying callers options object
    let updatedOptions = { ...options };
    let mergedHeaders = this.header;
    if(options.headers) {
      for(let key of options.headers.keys()) {
        let values = options.headers.getAll(key);
        if(values) {
          mergedHeaders = mergedHeaders.set(key, values);
        }
      }
    }
    updatedOptions.headers = mergedHeaders;

    return this.http.get<T>(this.buildUrl(endpoint), updatedOptions as any).pipe(
      retry(3)
    );
  }
}


export interface APISource {
  endpoint: string,
  params?: Params
  options?: HttpOptions
}

export interface HttpOptions {
  params?: Params
  headers?: HttpHeaders;
  observe?: "body" | "events" | "response";
  reportProgress?: boolean;
  responseType?: "arraybuffer" | "blob" | "json" | "text";
}