import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, provideZoneChangeDetection, inject } from '@angular/core';
import { provideRouter, withHashLocation, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Configuration } from './services/configuration/configuration';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withHashLocation()),
    provideHttpClient(),
    provideAppInitializer(() => {
      const configService = inject(Configuration);
      return configService.loadConfig(); 
    })
  ]
};
