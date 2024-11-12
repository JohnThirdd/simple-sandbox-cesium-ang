import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CesiumDirective } from './components/cesium.directive';
import { HeroDetailComponent } from './components/primitive/hero-detail/hero-detail.component';
import { ToolPanelComponent } from './components/blocks/tool-panel/tool-panel.component';
import { MainBlockComponent } from './components/blocks/main-block/main-block.component';
import { InfoBlockComponent } from './components/blocks/info-block/info-block.component';

@NgModule({
  declarations: [
    AppComponent,
    CesiumDirective,
    HeroDetailComponent,
    ToolPanelComponent,
    MainBlockComponent,
    InfoBlockComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
