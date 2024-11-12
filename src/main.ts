import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

(window as any)['CESIUM_BASE_URL'] = '/assets/cesium/';
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4NzhjZTg3Yy05NjQzLTQyZWMtYmU2MC1jNzg0MGZiYTVhOGUiLCJpZCI6MjExNTQ5LCJpYXQiOjE3MTQxMzcwMDd9.Rv2LlEmf-HAhsRxgPOboe9wLSHoTxOVezTRDFNpGWIc";

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
