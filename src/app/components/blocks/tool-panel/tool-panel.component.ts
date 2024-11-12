import { Component, EventEmitter, Output } from '@angular/core';
// import * as obj from '../../../../assets/json/cameraPoints.json';


@Component({
  selector: 'app-tool-panel',
  templateUrl: './tool-panel.component.html',
  styleUrl: './tool-panel.component.css'
})


export class ToolPanelComponent {

  buttonsFlyTo: object = {
    'ИТ-Парк Челны': [52.449385, 55.738218, 1300.0],
    'Казанский кремль': [49.104766, 55.799727, 1300.0],
    'Исаакиевский собор': [30.305936, 59.934190, 1300.0],
    'Мост в Москве': [37.638435, 55.746890, 1300.0]
  }
  disabled: boolean = false;

  @Output() CameraFlyToEmitter: any = new EventEmitter<any>;

  cameraGoTo(coordinate: number[]) {
    this.CameraFlyToEmitter.emit(coordinate);
  }
}
