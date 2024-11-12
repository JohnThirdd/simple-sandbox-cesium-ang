import { Component, EventEmitter } from '@angular/core';
import { Observable, Subject } from 'rxjs';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})


export class AppComponent {
  title = 'angular-cesium-test';
  toolPanelHidden: boolean = true;
  cameraFlyTo$: Subject<any> = new Subject();
  componentsInfo: Array<any> = []

  toolPanelVisibleChange() {
    this.toolPanelHidden = !this.toolPanelHidden;
  }

  test(coordinates: Number[]): void {
    this.cameraFlyTo$.next(coordinates);
    //console.log(`x:${coordinates[0]}, y:${coordinates[1]}, z:${coordinates[2]}`);
  }
}
