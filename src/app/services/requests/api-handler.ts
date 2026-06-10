import { inject, Injectable, Signal, Injector } from '@angular/core';
import { Configuration } from '../configuration/configuration';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { retry } from "rxjs";
import { rxResource } from '@angular/core/rxjs-interop';

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

  // injector should be passed if calling outside of an injection context (e.g. outside a component constructor)
  // will provide a resource for loading a data stream automatically handling cancellations and other caveats
  public getAPIResource<T>(stream: Signal<APISource>, injector?: Injector) {
    return rxResource<T, APISource>({
      injector: injector,
      params: () => stream(),
      stream: ({ params: source }: { params: APISource }) => this.get<T>(source.endpoint, source.params)
    });
  }
}


export type RequestParams = Record<string, string | number | boolean>;

export interface APISource {
  endpoint: string,
  params?: RequestParams
}
