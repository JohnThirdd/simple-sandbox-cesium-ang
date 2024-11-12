import { ThisReceiver } from '@angular/compiler';
import {
  Directive,
  OnInit,
  EventEmitter,
  OnDestroy,
  ElementRef,
  Input,
  Output,
} from '@angular/core';
import {
  BoundingSphere,
  Cartesian3,
  type Cesium3DTile,
  Cesium3DTileStyle,
  BillboardCollection,
  Label,
  VerticalOrigin,
  DistanceDisplayCondition,
  LabelStyle,
  ShowGeometryInstanceAttribute,
  Cesium3DTileset,
  Cartesian2,
} from 'cesium';
import { Subject, interval, timestamp, Subscription } from 'rxjs';

interface IPropertyInfo {
  name: string;
  value: string;
}

type TileData = {
  date: string;
  // color: string;
  uri: string;
  coords: Cartesian3;
  // tile: any;
  timestamp: number;
  label?: Label;
};

type HoverMovement = {
  startPosition: Cartesian2;
  endPosition: Cartesian2;
};

@Directive({
  selector: '[appCesium]',
})
export class CesiumDirective implements OnInit, OnDestroy {
  testpara: boolean = false;
  testobj: any;
  color: any;
  viewer: any;
  entity: any;
  billboards: any;
  open: boolean = false;
  lable: any;
  worker?: Worker;
  countWork: number = 0;

  arrayTilesData: Array<TileData> = [];
  currentGeometryError: number = -1;
  isCameraMovie: boolean = false;
  selectedTilesCount: number = 0;
  tileset: Cesium3DTileset | null = null;
  timeout: ReturnType<typeof setTimeout> | undefined;
  updateLabelInterval$: Subscription | null = null;

  labelCollection: any;
  @Input('cameraFlyTo$') cameraFlyTo$: Subject<any> = new Subject();
  @Output() openProperty$: any = new EventEmitter<any>();

  constructor(private el: ElementRef) {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(
        new URL('../workers/test-workers.worker', import.meta.url)
      );
      this.worker.addEventListener('message', (mes: MessageEvent) => {
        console.log('[получено с воркера]', mes.data);
        this.countWork--;
      });
    } else alert('Web Worker is not supported.');

    const cameraImageBlue =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAxCAYAAABQxxDJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAYVSURBVHgB7Vjfb1NVHP+e2646N5Ou6iBGTAeNwBRYIk4xGAr+CA8aQB40lLF18uCDJhAf8EkhvsCDAn+AG+NX1AcZJkb8uWE0xoFaNsYPM1gBJYwoNLGD2LU9fj/n3tvedve2vV0TH/STNPecnnPP+dzv73MEuUTP/sMrhJRhEtTGXfyCluE4keQfxSRp/d2bNhwnFxCVTOrt7fWT19dJWeoySOTg89VRKjVl/6JkckIOZjxi++ZI5BLNlIwhiX08M6g2r6uj0Ly5NHtWMwUCAWpsbMjNvXHjJhNL0eUrv9G1iQm6cTNhJbadsqm90Wg04ZqMkoaoe5s0sQV9bN62eBHNnj2LKgXInTl7jsYujpuE4hkvhZ2kJByIBEmrO0JCtEESbUsWUevCBVQtkskkHfvia0pOToJRQkra0t25sa8sGZ2IbwBqaWxooNXPPc2qaKRaYOjESTpz7lfVllJ2FRMSRUT8TOQXEAk0NSkiPp+PaonYqWGKDZ8GnURWeMOvdLx8yhzTCmZ66nabElkVfqrmRIC2JYupdcFD3BJ+LZvpVwIoJtPTd7CTJ3TVWjV2aH9sKQWa/KQ81MNOYkCpyWony5c9QaHQXNtFJjMc1W4Rjd/mdpqowUvUUs9R7y5ue8gV4GmffPqZamc8FISHeVVP864x7cSJCAjsGiO6/rf94o/czV/cxM9GnVw5BAK819wW5faejET42KpLpu/QOMisfvYZjiPNtkTeGKWK0XwH0cNM7nG/TqzZwfTy0pEJyky1eHsOH15BaamM1o4IAIm4AaSH38Afev/dVlanjbQgHQTTaxPX/dJXv8Ir0tm1MJ0H5zxgu/DAn86qKYX7WBrPz9LVByJYAxIrBvZlMiQy6bBXJT6JP+fYLjp+i1zhLjbkl+4nesHIGjD6V0fyZLbNK5QS7FRBCCYjhcrC1oRXLZl2tpHXg0wgS/TWeZ0IVJRM6+MgNJQoJJMLIZL88CZ/KTKVuGyxNHYykdG/8uMwZKjbDpZ9g14qg3JkYBtvhgq/Ft4zWmK+ExCBVX2BOsQOpWIG3Ped+faeYsX1VH7+qnsLx/L7yoTXIONHtWaXi/AyRBy/VUgCaoGn2CF+u/BDoLJgvW5PxUgmJ/WGEHGQieE9VGahxunRF2p6rzVvyFBBg6FcGCgM9bVgXjogbs5FqgC2hXS7sUNyMqk3uPDS2LUH0UY0LAVshi/uuaIHwZ1jOtEJ9pBdF3RVQAIYN9FueK0TEeDyld/1BvPwUjp1nDw+lSNQ0ZUqG/DFVq/A5ghsH13lWDI8nXwpEiagESCj3dmvcYEcQwVvFtKl0D1HV4npER9e1d252EPQR3Arh7ELF3WbERTbHFl/SdUzUmj78IwNj5RdAAYND1p5D9FpI5bAtU1CeGLcLvQXw9xPCrEHz1zZ2bv/EEr4IE4AUFcl+DGRVwWiKwzaauAlieTKT4pHN0Va0MhVetIruky25YzZhNUmIAnYSSVEsL5BhMWRjZr/58h0b8BRVCpxfXP827z/1xhYF+sr8MEu2tExaI5NP6ocODjASgwjZ6DYcspZ1QASsXxoP6tnnXVcm/ZGemodM47hBVRhsPhaAOsc+/Irw3vEIGVS0eI5zsfb/Qd387A62roxajtYjJVgCtFNG7fazXPMyUePfPz52hfXoxlGJQa4OWebGDrxE42MntU7grYwkR1Oc8vfQvQdWiME7eOmPzSvhZY/uYwqxXff/2Ae+hPsNeusxloVGeD9Ax8s0WRmEIRaF86n9qWPln3Hoho+xnoKjrFO0KgCYCEsiIXPnD3PG43UnEjFZExCfJXRpTbjwOjkZbiPMY0V8ysl4ooM0N0ZOQojRHvo5M/TAiP6ufzGAU3NdwFXZIBoR2Qv3BNZHnHDWq7qfdzvsft2Rna4XbuCTGKDzNQOroHWsiSCkBBOhYiuhqTiarwKVORNdjA8LDZ9xezKci7sBNdqMqEMU/ANZgFYPVUSmREZhXSK7QcX0QrxjKd+D80AMyKDO12pie1o44nSkf5t6En1f/xHUHWcMaFKDI3aZFbG7a7g3WBmrk1Gvkqn+kR2ylUessM/Ah+EBOvtfY0AAAAASUVORK5CYII=';
    const he = 62;
    const wi = 50.72;

    // interval(100).subscribe(() => {
    //   if(!this.tileset) return
    //   const tileArray = (this.tileset as Cesium3DTileset & {_selectedTiles: any})._selectedTiles;
    //   if(tileArray.length != this.selectedTilesCount) {
    //     // this.arrayTilesData.findIndex((tileData: TileData) => this);
    //     console.log(tileArray.length, this.selectedTilesCount);
    //     // console.log('label find - ', this.labelCollection.contains({
    //     //   name: '16/79241/53073.glb'
    //     // }))
    //     this.labelCollection.removeAll();
    //     tileArray.forEach((element: any) => {
    //       let obj = {
    //         date: element._content?._model?._loader?._components?.structuralMetadata?._schema?._classes?.["date"].name ?? "",
    //         // color: element._content?._model?._loader?._components?.structuralMetadata?._schema?._classes?.["Цвет"].name ?? "",
    //         uri: element._contentHeader.uri,
    //         coords: element._boundingVolume._boundingSphere.center ?? new Cartesian3(),
    //         tile: element._content._tile
    //       }
    //       this.createLabel(obj);
    //       this.selectedTilesCount = tileArray.length;
    //     });
    //     // console.log(this.labelCollection);
    //   }
    // });

    this.viewer = new Cesium.Viewer(this.el.nativeElement, {
      baseLayerPicker: false,
      fullscreenButton: false,
      homeButton: false,
      infoBox: false,
      timeline: false,
      selectionIndicator: false,
      navigationHelpButton: false,
      animation: false,
      geocoder: false,
      scene3DOnly: true,
      shouldAnimate: true,
    });
    this.setAsyncViewerParams();

    this.viewer.resolutionScale = window.devicePixelRatio;
    this.viewer.scene.postProcessStages.fxaa.enabled = true;
    // this.viewer.scene.msaaSamples = 8;
    this.labelCollection = this.viewer.scene.primitives.add(
      new Cesium.LabelCollection()
    );
    this.billboards = this.viewer.scene.primitives.add(
      new Cesium.BillboardCollection()
    ); /*
    this.billboards.add({
      position: new Cesium.Cartesian3.fromDegrees(52.449385, 55.738318, 120),
      image: 'assets/images/camera_err.png',
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      width: wi,
      height: he,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      // eyeOffset: new Cesium.Cartesian3(0.0, 0.0, -100.0),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 2000.0)
    });
    this.billboards.add({
      position: new Cesium.Cartesian3.fromDegrees(52.449385, 55.738218, 120),
      image: 'assets/images/camera_suc.png',
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      width: wi,
      height: he,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      // eyeOffset: new Cesium.Cartesian3(0.0, 0.0, -100.0),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 2000.0)
    });
    this.billboards.add({
      position: new Cesium.Cartesian3.fromDegrees(52.449285, 55.738318, 120),
      image: 'assets/images/camera_off.png',
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      width: wi,
      height: he,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      // eyeOffset: new Cesium.Cartesian3(0.0, 0.0, -100.0),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 2000.0)
    });
    this.billboards.add({
      position: new Cesium.Cartesian3.fromDegrees(52.450285, 55.738318, 125),
      image: 'assets/images/camera_off.png',
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      width: wi,
      height: he,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      // eyeOffset: new Cesium.Cartesian3(0.0, 0.0, -100.0),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 2000.0)
    });*/

    this.billboards.add({
      position: new Cesium.Cartesian3.fromDegrees(52.450285, 55.738318, 125),
      image: 'assets/images/camera_off.png',
      width: wi,
      height: he,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
        0.0,
        2000.0
      ),
    });

    // this.viewer.scene.primitives.add(
    //   Cesium.Model.fromGltf({
    //     url: 'assets/tilesets/output/39620-26536/15/39620/26536.glb'
    //   })
    // );

    this.cameraFlyTo([37.638435, 55.74689, 1300.0]);
  }

  async setAsyncViewerParams(): Promise<void> {
    this.viewer.terrainProvider =
      await Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
        requestVertexNormals: true,
      });
  }

  changeColor(color: any): any {
    const coef = -0.15;
    return {
      alpha: 1,
      blue: color.blue + coef,
      green: color.green + coef,
      red: color.red + coef,
    };
  }

  cameraFlyTo(coordinates: Number[]): void {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        coordinates[0],
        coordinates[1],
        coordinates[2]
      ),
    });
  }

  ngOnInit(): void {
    this.cameraFlyTo$.subscribe((val: Number[]) => {
      this.cameraFlyTo(val);
    });
    this.createTileSet();
  }

  clearCameraColors(cameraOff: String): void {
    let primitives = this.viewer.scene.primitives._primitives;
    let found = primitives.find(
      (_el: any) => _el._url == 'assets/tilesets/tileset.json'
    );
    found.style = new Cesium.Cesium3DTileStyle({
      disableDepthTestDistance: 'Number.POSITIVE_INFINITY',
      image: cameraOff,
    });
  }

  createLabel(item: TileData): void {
    let bv = item.coords;
    let cart = new Cesium.Cartesian3(bv.x, bv.y, bv.z);
    let cartogr = Cesium.Cartographic.fromCartesian(cart);
    let latitude = Cesium.Math.toDegrees(cartogr.latitude);
    let longitude = Cesium.Math.toDegrees(cartogr.longitude);
    const label = this.labelCollection.add({
      // name: item.uri,
      position: new Cesium.Cartesian3.fromDegrees(longitude, latitude, 200),
      text: item.date,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      scale: 0.7,
      showBackground: true,
    });
    item.label = label;
  }

  drawSphere(boundingSphere: BoundingSphere) {
    // this.removeSphere();
    const radius = boundingSphere.radius;
    this.viewer.entities.add({
      name: "Camera's looking sphere",
      position: boundingSphere.center,
      ellipsoid: {
        radii: new Cesium.Cartesian3(radius, radius, radius),
        material: Cesium.Color.RED.withAlpha(0.5),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
      },
    });
  }

  mouseMoveHandler(mouse: HoverMovement) {
    const pick = this.viewer.scene.pick(mouse.endPosition);
    console.log('pick', pick);
    // if (!this.worker) {
    //   return;
    // }
    // if (this.countWork < 100) {
    //   console.log('отправлено в воркер', this.countWork);
    //   this.worker.postMessage(this.countWork++);
    // }
    // const propArr = [
    //   {
    //     name: 'testname',
    //     value: 'testvalue',
    //   },
    //   {
    //     name: 'testname2',
    //     value: 'testvalue2',
    //   },
    // ];
    // // this.lable.label.text = _classes["date"].name;
    // // this.openProperty$.emit(propArr);
    // // console.log('move', pick);
    // if (!pick) {
    //   return;
    // }
  }

  isCameraView(boundingSphere: BoundingSphere) {
    const camera = this.viewer.scene.camera;
    const cullingVolume = camera.frustum.computeCullingVolume(
      camera.position,
      camera.direction,
      camera.up
    );
    const intersection = cullingVolume.computeVisibility(boundingSphere);

    return (
      intersection !== Cesium.Intersect.OUTSIDE &&
      intersection !== Cesium.Intersect.INSIDE
    );
  }

  async createTileSet(): Promise<void> {
    const cameraOff =
      "'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAwCAYAAACbm8NsAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAUwSURBVHgBtZnLLyxZHMd/XdojEdITBJEYbJAI2kJmNyMsBpGwYiXppYhc/oJpf4GZWNiytMEsPBbk9o3XjYVuGySEvsIGyW2vhHjd37dSp3K6uqrrdGvfROp1+pxP/V7nnOKhFDUxMfGXpmm9/Nf0/v5e5fF4qsQzvo7ydfTt7W2P/xbGxsZClII8Ko0YwOf1er/wYKM8mI8UBTg+hF5fX8cZLOrW3vMZEA4KjoyMjFM6MAxSlZWV9VV2A5Sbm0t1dXVUUVFBJSUlVFBQYD67vr6m29tbOjk5oYuLC7q7u4vrE5ZiK7U5WcnjANJsgJjWwOCtra36UVUHBwe0s7NjhYpxvLUNDw9HXGGsILAEIJqamihd7e3t6VBPT09JgTwWELgmLEAKCwupr68vzhXpCu6bn5+XrRR7eXnxyy7T5B/IFskkiEN/PoyHJEmAmZyc/EcEK1yTSRArEPqHMB67azQOBu7hQ1DcRIxkGkQGQv8mgKZ9EdbRjBtBufFHglVF6F/KSp+wjg7D5vpTPJGpkwmZsbKyQoeHh5SOrNbBMQtzDQeSTgartLe3K3W2trZGx8fHeoEDWFlZGXG1JlVhLKQ8F0Fc5nV1dX3TMOmJBqoFDTXj6OjIvEans7OzCRXXTajkQjyxYvLVzACprq527QDWAIxVqCMzMzO2z5wkvzw4NJ4vTAKYzk2bm5tJnwNmcXFRyUrFxcXmOZYjGgfv73YPndTY2Oja5vT0VK+2bsEtv7xecyhF+f1+GhwcTFqH6uvrdbetrq7S1tYWqSplGCg7O5t6e3t1MDs9Pj6a5zk5OaQMw776IS6S+VmsUaDLy0uam5ujoqIi6uzsTLAS3ISS39PTo4M7BTWsJ4S1DmLmp7hxdXXlCIOFE2IAa5T9/X16eHjQ3XB+fk7d3d1UU1NjtvX5fDQwMEBnZ2d62jtVdMvL//ByfqPYNNs8TBBA8CeUl5dHz8/P+hty0aJwOEw3NzfU0tKiZ9T9/T319/ebE6PdC0qWiXjZMuYCB65QnZdQIzo6OuJcJMcQ4GC9ZIGO8YTA4eVyHBJlHKQo7U5v0tDQoLujtLTUsY0Q0jZZ3cI4IgYhjq2QZqy0QqIBgs9OsERtbS1VVla6gqhItgorMjQ0FNVTG3Ej7soxYYUpLy+nTEkuiBwvMzgKmH/FA7stRqaFgLe4aMGEYVfFyHAVFIlE6DMl1x0O3Gm4yIQxZO72YEJpW5FRwSp2LoqD4a1niKRA3tjYoM+QbBUG+WaMGw9jyLQOAln2ayZktQq7KCg/j4ORrQOlslBS0dLSkgwyLVslAQbiAhgQ57AM5pZMCJaWyz+vuxO+SCTAILI51c2GNhv3lAX3WKw8LjIoKQyEuoMvUDhHMGN2/oiwkxAvhH7ZPUG7drYwqDsc6RlxFywiJwK7p82preNKzwiu/8T1+vp6ytmFGFFxjyuMAYTNXUhcy+Z2E+IEaxohLBGc3KMEAxnZFZMHUKnOSGM5Ttg9fW6/cYUxzGp2BNO7VWe41LKKCyRzj1AWKWh5eTnKC+8bfsO/BRBktx1GjOzu7sq3xtk906QgJRgD6DsvJX/j0z9wLYJZBgKINWDd4iQtGANohYGwHW4WQFhaYieK1N/e3pabLzDIEKUg9W8Yhvij4CgHdZMAQkEElLxCRObk5+cHUuxa7XO9VfjsxauzMDbrCR1y5jCIPxAIxChFpbW9RYVGJRVThgyC++mA6L+nD2hqaqqKtzpfjf+u6CAqKeyktCwjhIEBwDD/fxQE+gUMxrl3IrLZWwAAAABJRU5ErkJggg=='";
    const cameraOn =
      "'data:image/png;base64,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'";

    let scene = this.viewer.scene;
    // scene.debugShowFramesPerSecond = true;
    /*let handMouseMove = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handMouseMove.setInputAction((movement: any) => {
        this.clearCameraColors(cameraOff);
        let pickedFeature = this.viewer.scene.pick(movement.endPosition);
        if(Cesium.defined(pickedFeature)) {  
          let picked = pickedFeature._content;
          if(picked) {
            let id = pickedFeature.getProperty("cameraid");
            let tiles = picked._tileset;
            tiles.style = new Cesium.Cesium3DTileStyle({
              disableDepthTestDistance: 'Number.POSITIVE_INFINITY',
              image: {
                conditions: [
                  ['${cameraid} === "' + id + '"', cameraOn]
                ]
              }
            })
            // console.log(id);
          }
        } 
      }, 
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );

    let handMouseClick = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handMouseClick.setInputAction((movement: any) => {
        // this.openProperty$.emit([]);
        let pickedFeature = this.viewer.scene.pick(movement.position);
        if(Cesium.defined(pickedFeature)) {
          let picked = pickedFeature._content;
          if(picked) {
            let propIds = pickedFeature.getPropertyIds();
            let propArr: Array<IPropertyInfo> = [];
            for(let item of propIds) {
              propArr.push({
                name: item,
                value: pickedFeature.getProperty(item)
              })
            }
            this.openProperty$.emit(propArr);
            // console.log(propArr);
          }
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    )*/
    // this.viewer.scene.light.intensity = 7.0;
    let ellipsoid = scene.globe.ellipsoid;

    let handMouseClick = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handMouseClick.setInputAction((movement: any) => {
      let pickedFeature = this.viewer.scene.pick(movement.endPosition);
      // console.log('click!');
      // console.log(pickedFeature);

      this.mouseMoveHandler(movement);

      if (this.testobj) {
        this.testobj.color = this.color;
      }

      if (pickedFeature) {
        // let cartesian = this.viewer.camera.pickEllipsoid(movement.startPosition, ellipsoid);
        // if (cartesian) {
        //   let cartographic = ellipsoid.cartesianToCartographic(cartesian);
        //   let longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(15);
        //   let latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(15);
        //   this.lable.position = new Cesium.Cartesian3.fromDegrees(longitudeString, latitudeString, 200);
        // }

        if (pickedFeature?.content?._tileset) {
          // console.log(pickedFeature)
          // if(!this.testpara) {
          //   pickedFeature.content._tileset.style = new Cesium.Cesium3DTileStyle({
          //     color: "color('white')"
          //   })
          //   this.testpara = true;
          // }
          this.color = pickedFeature.content._tile.color;
          pickedFeature.content._tile.color = this.changeColor(
            pickedFeature.content._tile.color
          );
          // pickedFeature.content._tile.color = Cesium.Color.RED;
          this.testobj = pickedFeature.content._tile;
        } /*else {
            // console.log(pickedFeature);
            pickedFeature.id.model.color = Cesium.Color.RED;
          }*/
        // console.log(pickedFeature.content._tile._content.extras)
        if (
          pickedFeature?.detail?.model?._loader?._components?.structuralMetadata
            ?._schema?._classes
        ) {
          let propArr: Array<IPropertyInfo> = [];
          let { _classes } =
            pickedFeature?.detail?.model?._loader?._components
              ?.structuralMetadata?._schema;
          for (let key in _classes) {
            propArr.push({
              name: key,
              value: _classes[key]._name,
            });
          }
          // this.lable.label.text = _classes["date"].name;
          this.openProperty$.emit(propArr);
          this.open = true;
        }
      } else {
        // this.viewer.scene.primitives._primitives[1].style = new Cesium.Cesium3DTileStyle({
        //   color: "color('white')"
        // });
        this.testobj = undefined;
        // this.viewer.scene.primitives._primitives[3].color = Cesium.Color.WHITE;
        if (this.open) this.openProperty$.emit([]);
        // this.lable.label.text = '';
      }

      // if(pickedFeature?.getPropertyIds) {
      //   let propertyIds = pickedFeature.getPropertyIds();
      //   // pickedFeature.color = Cesium.Color.RED;
      //   for(let item of propertyIds) {
      //     propArr.push({
      //       name: item,
      //       value: pickedFeature.getProperty(item)
      //     })
      //   }
      // }

      // if(Cesium.defined(pickedFeature.getPropertyIds)) {
      //   console.log(pickedFeature.getPropertyIds())
      //   // let model = pickedFeature.content._model;
      //   // let metadata = model.metadata;
      //   // console.log(metadata);
      //   // let cust = model.gltf.extras;
      //   // console.log(cust);
      // } else {
      //   console.log('not working');
      // }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    try {
      // this.viewer.scene.primitives.add(
      //   Cesium.Model.fromGltfAsync({
      //     url: 'assets/tilesets/output/39620-26536/15/39620/26536.glb'
      //   })
      // );
      // const primitiveCollection = new Cesium.PrimitiveCollection();

      // const tilesetOsmBuildings = await Cesium.Cesium3DTileset.fromIonAssetId(96188);
      // const tilesetPhotoreslistic = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
      // const tilesetSimpleSphere = await Cesium.Cesium3DTileset.fromIonAssetId(2596230);
      // const tileset = await Cesium.Cesium3DTileset.fromUrl('assets/tilesets/tileset.json');
      // const tilesetsWithMetaInfo = await Cesium.Cesium3DTileset.fromUrl(
      //   'assets/tilesets/schema2/39620-26536/Tileset 39620 26536.json'
      // );
      // this.viewer.extend(Cesium.viewerCesiumInspectorMixin);
      // console.log(tilesetsWithMetaInfo);

      //↓↓↓↓↓↓↓↓↓↓↓↓
      //↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
      //↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

      // tilesetsWithMetaInfo.debugColorizeTiles = true;
      // tilesetsWithMetaInfo.debugShowUrl = true;
      // tilesetsWithMetaInfo.debugShowRenderingStatistics = true;
      // tilesetsWithMetaInfo.debugShowMemoryUsage = true;
      // tilesetsWithMetaInfo.debugShowGeometricError = true;

      // tilesetsWithMetaInfo.debugShowContentBoundingVolume = true; //← ← ←
      // tilesetsWithMetaInfo.debugShowBoundingVolume  = true; //← ← ← 2

      //↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
      //↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
      //↑↑↑↑↑↑↑↑↑↑↑↑

      // const tilesetsWithMetaInfo2 = await Cesium.Cesium3DTileset.fromUrl('assets/tilesets/output_Extras/39620-26536/Tileset 39620 26536.json');

      // primitiveCollection.add(tilesetOsmBuildings);

      // this.viewer.scene.primitives.add(tilesetOsmBuildings);
      // this.viewer.scene.primitives.add(tilesetPhotoreslistic);
      // this.viewer.scene.primitives.add(tilesetSimpleSphere);
      // this.viewer.scene.primitives.add(tileset);

      // let tilesetAdd = this.viewer.scene.primitives.add(tilesetsWithMetaInfo);
      // this.tileset = tilesetAdd;

      // tilesetAdd.tileVisible.addEventListener((tile: any) => {
      // console.log(tile);
      // const geometricError = tile.geometricError;
      // if(geometricError != this.currentGeometryError) {
      //   this.arrayTilesData = [];
      //   this.currentGeometryError = geometricError;
      // }
      //   const uri: string = tile._contentHeader.uri;
      //   const index = this.arrayTilesData.findIndex(
      //     (tileData: TileData) => uri === tileData.uri
      //   );
      //   if (index === -1) {
      //     let obj = {
      //       date:
      //         tile._content?._model?._loader?._components?.structuralMetadata
      //           ?._schema?._classes?.['date'].name ?? '',
      //       // color: tile._content?._model?._loader?._components?.structuralMetadata?._schema?._classes?.["Цвет"].name ?? "",
      //       uri: uri,
      //       coords:
      //         tile._boundingVolume._boundingSphere.center ?? new Cartesian3(),
      //       // tile: tile._content._tile
      //       timestamp: new Date().getTime(),
      //     };
      //     this.arrayTilesData.push(obj);
      //     // this.createLabel(obj);
      //   } else {
      //     this.arrayTilesData[index].timestamp = new Date().getTime();
      //   }
      //   // this.arrayTilesData = this.arrayTilesData.filter((item: TileData) => item.tile._shouldSelect);
      // });

      // scene.camera.moveStart.addEventListener(() => {
      //   this.isCameraMovie = true;
      //   // this.arrayTilesData = [];
      // });
      // scene.camera.moveEnd.addEventListener(() => {
      //   // console.log(this.arrayTilesData);
      //   this.isCameraMovie = false;
      //   this.labelCollection.removeAll();
      //   this.arrayTilesData.forEach(tile => {
      //     const now = new Date().getTime();
      //     if((now - tile.timestamp) < 500 ) {
      //       this.createLabel(tile);
      //     }
      //   });
      // })

      this.updateLabelInterval$ = interval(100).subscribe(() => {
        this.arrayTilesData.forEach((tile) => {
          const now = new Date().getTime();
          if (now - tile.timestamp < 100 && !tile.label) {
            this.createLabel(tile);
          }
          if (now - tile.timestamp < 100 && tile.label) {
            tile.label.show = true;
          }
          if (now - tile.timestamp > 100 && tile.label) {
            tile.label.show = false;
          }
        });
      });

      // scene.camera.moveEnd.addEventListener(() => {
      //   this.isCameraMovie = true;
      //   // console.log(tilesetAdd.);
      //   // setTimeout(() => {
      //   //   console.log("камера сдвинулась", tilesetAdd._selectedTiles.length);
      //   // }, 0)
      //   console.log(this.arrayTilesData);
      //   this.labelCollection.removeAll();
      //   for (let item of this.arrayTilesData) {
      //     this.createLabel(item);
      //     // console.log(item.tile._shouldSelect);
      //     // console.log(this.isCameraView(item.tile._boundingVolume._boundingSphere));
      //     // if (!this.isCameraView(item.tile._boundingVolume._boundingSphere)) {
      //     //   continue
      //     // }
      //     // console.log('тайл найден')
      //     // let { _classes } = item._content._model._loader._components.structuralMetadata._schema
      //     // item.color = Cesium.Color.fromRandom({
      //     //   minimumRed : 0.35,
      //     //   minimumGreen : 0.35,
      //     //   minimumBlue : 0.35,
      //     //   alpha : 1.0
      //     // });
      //   }
      //   this.arrayTilesData = [];
      //   // this.lable.position = new Cesium.Cartesian3.fromDegrees(longitude, latitude, 200);
      //   // this.lable.text = "проверка координаты";
      // });

      // tilesetAdd.tileVisible.addEventListener((tile: any) => {
      //   // console.log(tile);
      // })
      // tilesetAdd.tileLoad.addEventListener((tile: any) => {
      //   console.log(tile);
      // });

      // tilesetAdd.allTilesLoaded.addEventListener(() => {
      //   // console.log(tilesetAdd);
      //   this.labelCollection.removeAll();
      //   for(let item of tilesetAdd._selectedTiles) {
      //     let { _classes } = item._content._model._loader._components.structuralMetadata._schema
      //     item.color = Cesium.Color.fromRandom({
      //       minimumRed : 0.35,
      //       minimumGreen : 0.35,
      //       minimumBlue : 0.35,
      //       alpha : 1.0
      //     });
      //     let bv = item._boundingVolume._boundingSphere.center;
      //     let cart = new Cesium.Cartesian3(bv.x, bv.y, bv.z);
      //     let cartogr = Cesium.Cartographic.fromCartesian(cart);
      //     let latitude = Cesium.Math.toDegrees(cartogr.latitude);
      //     let longitude = Cesium.Math.toDegrees(cartogr.longitude);
      //     this.labelCollection.add({
      //       position: new Cesium.Cartesian3.fromDegrees(longitude, latitude, 200),
      //       text: _classes["date"].name,
      //       disableDepthTestDistance: Number.POSITIVE_INFINITY,
      //       horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      //       scale: 0.7
      //       // showBackground: true
      //     })
      //   }
      //   // this.lable.position = new Cesium.Cartesian3.fromDegrees(longitude, latitude, 200);
      //   // this.lable.text = "проверка координаты";
      // });

      // this.viewer.flyTo(tilesetsWithMetaInfo);
      // console.log(tilesetsWithMetaInfo);

      // const ent = Cesium.Model.fromGltfAsync

      // this.lable = this.viewer.entities.add({
      //   name: "label_info",
      //   position: new Cesium.Cartesian3.fromDegrees(37.638435, 55.746890, 700),
      //   label: {
      //     id: 'infolabel',
      //     text: 'Text text texxt',
      //     disableDepthTestDistance: Number.POSITIVE_INFINITY,
      //     showBackground: true
      //   }
      // })

      const entity = this.viewer.entities.add({
        name: 'url',
        position: new Cesium.Cartesian3.fromDegrees(37.638435, 55.74689, 500),
        model: {
          // uri: 'assets/tilesets/sandcastleGlb/0.glb',
          // uri: 'assets/tilesets/sandcastleGlb/N12E045_D300_S001_T001_L3_U6_R0.glb',
          // uri: 'assets/tilesets/Duck.glb',
          // uri: 'assets/tilesets/2validate/39620-26536/15/39620/26536.glb',
          // uri: 'assets/tilesets/2validate/gltf/26536.glb',
          uri: 'assets/newglb/444.glb', //[ТУТ ССЫЛКА НА ГЛБ]
          minimumPixelSize: 128,
          maximumScale: 20000,
          label: new Cesium.LabelGraphics({
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            text: 'test',
          }),
        },
      });

      entity.style = new Cesium.Cesium3DTileStyle({
        // color : "color(${color})"
        // labelOutlineColor:  'color("blue")'
      });

      // const ent = this.viewer.entities.add(
      //   new Cesium.Model.fromGltfAsync({
      //     url: 'assets/tilesets/output_Extras/39620-26536/15/39620/26536.glb'
      //   })
      // )

      // this.viewer.scene.primitives.add(
      //   new Cesium.Cesium3DTileset({
      //     url: 'assets/tilesets/output/39620-26536/Tileset 39620 26536.json'
      //   })
      // )

      const cameraImageBlue2 =
        "'data:image/png;base64,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'";
      const cameraImageBlue4 =
        "'data:image/png;base64,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'";
      const cameraImageBlue =
        "'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAwCAYAAACbm8NsAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAATwSURBVHgBvVk7SytbFF6J8QG+IgoqijdXCxXEJBZayb2ijYpgKq2ElCJy9Bfc5Bd4LgqCVazERs8pFAvFiI/CwsRGBUVzRBsVjk/wnbO+zUyYPGcmiflgSDKznf3Nt7619tqjgXRiYmLiX6PR2M+HNRgMWgwGg0W+xr8D/Dvw+fm5z8eP8fFxL+mAQcsgJmA2mUzfeLIxnsxcVVVFZWVl4sjNzRUHcHNzQ/f39+Lz8vJSkOPT3o+PDzcTC6RERkmiuLjYbLVaqaGhITR5IoAUCO3u7tLDwwNOuUZHR92UDBkmYsnKylrPy8uztLa2Eogki8PDQ0GKCQZYpY54KhniELGBSHV1tbmnp0eTEmqAUltbW3R6enrLfusYGRnxq5KRibS1tZmhSLoBhfiIScgQQQSh8X0VkUhC7+/vdmXIjMpBUKSuru5LiQC4P2ekGfMhSaLITE5O/scZY2lvb6dMAF5EcnC4xsLIIDz84QLjwsJCygSQFJiPyXyT1RFk+ISrqKhI1JBMAuWCH94sqyPIcFX9R69PXl5eaGVlhY6OjigV2Gw2oQ6+Z2GtYSONwSt66sna2hqdnJygbghiFRUVxNWa9KKkpIT29vby2EMbRix6WGv0eAWpeXx8HPq9v79P8/PzctnXBQiA+XlhxeJrtGLB0wqoATKRQIWdnZ2NeU0NmB88jLwI/g3zasX29nbC6yCztLSkSyWQQTtiZPP+pUeZ5uZm1TFnZ2e0uLio2dwIFfoiI+mE3W6noaGhhB5rbGwUYVtdXaWdnR3SQgYQZJANepCdnU39/f2CWCw8Pz+Hvufk5JBWwDO/Xl9fVQcihdEsAVdXV7SwsEClpaXU3d0dpRLChKft6+sTxNVMDRXRFcIzv6+vr0kNaCXhATRKBwcH9PT0JMJwcXFBvb29VFtbGxprNptpcHCQzs/PRdqrNWaS2X+ZOL83+IeNNABEcMjghY7e3t7Ek2Hh8/l8dHd3Ry0tLSKjHh8faWBgQLWYSv2y38TK+GX59QCFqqurKyxESg+BHNTTUkyhOniYuCf1wsAghAkSoampSYSjvLxc9WlRu7TUL8yL+dlbXqPUaXnV1AHR+vp6qqmpSUtPLAOJwfAPDw8HRGrDNzCaGpnKykpKN0CG/TKL7zKZ73KoMgnMh0ziEP0IkeFQ3fKHN5lFLhUgM9m4HoQoREaCG0wzpQ7KAeqWHKIwMrz19FIG1cE8TGRDmjecjISMqCOrwiFyKc+HkcmUOsvLy8IrSlWiyADcxzqhTKqNdjzAtKi43HdHvZGIIgNnc6q7Nzc3dbcWakB4JNXdcgYlJAOg7nBbEUh3uHA/XjwDHB5XrOsxyaDusNOdqMpSuU4ZCA9Cz+HpiDcmbtspmet/7I+S2YIooRYezeAXAutzc3PBVODxeIJTU1M+tblUG3JkF7v/FoZOBvg7+ITD41Abq0pGktUB/6it7JGQ/wb+0xIeTVsV+IdvOI6n1FqdUUskNd2RxS0tYP98n5mZCbIhE3qE++AgxvF4F30leAIP76njEgIRGJbHLZJO6N5R8kvBMSbix/Y1MuWRwjjPhvUXFBQ4SSc0va6PBF57cXfm487f4nA4xA5AQSSQn59vdzqdtzpvmxwZYHp62sI7i3UQ6uzsFBs6KYU7ki1sSZNREpL+u5ISEUC3Z5TAxCDAZH6mSgT4A/1HQLdzqycQAAAAAElFTkSuQmCC'";
      const cameraImageBlue3 =
        "'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAwCAYAAACbm8NsAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAATtSURBVHgBvVlLLyxbFF7dCBNSgnhGd5gQocW9GMkZdAyQONw7YGRwz1Q6cX6AgR9wJc3I4EbfiRhcYkAM9KDjkeAeURJh4NGdYICB5wCNs746VZ3qZ9Xu15dUqrt6V+2v1vrW2muvtpAg3G73l8/Pz68Wi8XBZ7vVarVpv318fAT4up+vy3xecrlcPoFHk8XMoMnJSSknJ8fFE7j4q1RVVUWlpaVUVlZG+fn5ygHc3NzQw8MD3d7e0tXVFS6BmI8JT4yOjgZSIqMnUVRUJLW0tFBjY2No8kQAqcvLS9rZ2aHHx0diUhNsqQlKhgwTsefm5np5Ylt7ezu1trZSsjg6OtJI+fnFnPGsFJMM68LBN3nZHVJfX58pSxgBltrY2KCzs7M7tpKTrSQbktGIsDWkzs5OSje2t7dpd3c3JqEwMqpr/s8UkUhC/NK/6V1m1Q+CRurq6jJKBMDzq6urJbaOF0ESRYbdM84RY+vq6qJsoLe3F1q0I1rDyMA9bLLxjo4OKiwspGwAQYEoRdrQrKOQ4aQEq1BDQwNlE0gX/PKSZh2NzBdYRQQvLy+0urpKx8fHlAocDgepmZ1ysNbgC7Qikk/W1tbo5OQEeUMhVlFRgQAgURQXF9Pe3l5BT0+Pz4pFD2uNiFaQTUFEgyzLND8/r6R9UcAAHFlYLr5asfpi0TMLkACZSCDDejyemL8ZoaSkBFJxgIwd4jWLzc3NhL+DzPLyspCVsPozbBCwTf1iCs3NzYZjzs/PaXFx0bS4Va3arSSItrY2GhkZSagxpAi4DSLf2toik2R+hTaiQQR5eXk0MDAQt6zQPw9jzQJkAq+vr4YDEcIoloDr62taWFhQqj0OySgrwU142/7+foUMFsZEgBUZfpC5w8ONgJISRRKOw8NDen5+VtxwcXFBqHl4gQ2NlSSJhoeHKRAI0MHBgWFhppIJ5HIR7Xt6enKQCUCQelEWFBTQ29ub8jAsfJy8lM/QFSKKn0tDQ0OGyRT1MvOQkTJlzfwiQKLs7u4OcxFIaAA5WM9MMkUBzylmX7EMBAdCyISJ0NTURPX19VReXm74tshdZvIX5sX8nPR81rGxMT9f88H3iVBTU6OEbG1tbVpqYg2np6c4yaj4lNDG3gZCSwRYrbKyktINRB7P78Fnhcz7+7tbc1U2gfmwbLCLlkJk2FV3fPIls8ilAqQJFq5HK8pDywF2fGCaLesgBSBNcAD9q10LkVE36VmzjjqPT98cCFsos2UdzSqYT389jEy2rLOysqJoJbJlElVCBIPBb7BMqoV2PEC0yLiMqI5EFBkkQZhvfX1duLQwAtwDq7NVYvZrYhZXat4JpNtdWluEicTs08Qkg7zD1vkLVT/qmHQA7oHr0Z+JNyZu2amKy+31epPaguhh5B7TmJqa8s7NzQXZUkkfs7OzQX7OD6O5DAtyRBer/w6CTga4T22f/WE01pCMGl1/Qj84RLC/v6/cw/d/M+MeU1sV6Icf+B1vaTY7I5eghwediPaDTYH9/vfMzEyQBZlQI/f390GMm56eHqdMggn9w3vquIRARBXsfyQI4R0lC/o7E5GxfY0MeYSwel2G8EkQptr1kUDbi3sxP9ADHBwcVHYAOiJ+JvK7WrBlnoxKSOmgg5DT6VQ2dEYd8IyR0RPij/hnJSUigLBm9EAOYpdgrVlKlQjwE7ooQDoHwIMGAAAAAElFTkSuQmCC'";

      const my = "'assets/images/my_90.png'";
      const st = "'assets/images/st_90.png'";
      const st_sh = "'assets/images/st_shadow.png'";
      const transp = 0.99607843137254897802;

      // tilesetsWithMetaInfo.style = new Cesium.Cesium3DTileStyle({
      //   color: 'rgb(255, 255, 255, 1)',
      // });

      console.log(this.viewer);
      // primitiveCollection.add(tileset);
      /*tileset.style = new Cesium.Cesium3DTileStyle({
        disableDepthTestDistance: 'Number.POSITIVE_INFINITY',
        distanceDisplayCondition: 'vec2(0.0, 5.5e6)',
        // pointSize: '0',
        // labelText: '"text"',
        // backgroundEnabled: true,
        // scaleByDistance: "vec4(300, 1, 1000, 0.85)",
        // heightOffset: '4.0',
        // translucencyByDistance: `vec4(1, ${transp}, 1000, ${transp})`,
        // translucencyByDistance: `vec4(1, 1, 1000, 0.9)`,
        // showBackground : 'true',
        // backgroundColor : 'Cesium.Color.TRANSPARENT',
        image: cameraOff
      });*/

      // this.viewer.scene.primitives.raiseToTop(tileset);
      // this.viewer.scene.primitives.lowerToBottom(tilesetOsmBuildings);

      // this.viewer.scene.primitives.add(primitiveCollection);

      // primitiveCollection.raiseToTop(tileset);
      // primitiveCollection.lowerToBottom(tilesetOsmBuildings);
      // tileset.showOutline = false;
      // console.log(tileset.root);
    } catch (err) {
      console.log(err);
    }
  }

  ngOnDestroy(): void {
    this.cameraFlyTo$.unsubscribe();
    if (this.updateLabelInterval$) this.updateLabelInterval$.unsubscribe();
  }
}
