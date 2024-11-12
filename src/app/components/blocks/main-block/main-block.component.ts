import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subject, Subscription, throwError } from 'rxjs';


@Component({
  selector: 'app-main-block',
  templateUrl: './main-block.component.html',
  styleUrl: './main-block.component.css'
})


export class MainBlockComponent implements OnInit {
  @Input() toolPanelHidden: boolean = true;
  @Output() toolPanelVisibleChange = new EventEmitter<any>;
  @Input('cameraFlyTo$') cameraFlyTo$:Subject<any> = new Subject();

  @Output() openProperty$ = new EventEmitter<any>;

  constructor() { 
  }

  ngOnInit(): void {
  }
}
