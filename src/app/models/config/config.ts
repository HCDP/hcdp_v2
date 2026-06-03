
export interface HCDPConfig {
  location: string,
  timezone: string,
  api: {
    [api_source: string]: {
      url: string,
      token: string
    }
  }
}