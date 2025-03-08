import {CubismUserModel} from '@cubism/model/cubismusermodel';
import type {CubismEyeBlink} from '@cubism/effect/cubismeyeblink';
import type {CubismBreath} from '@cubism/effect/cubismbreath';
import type {CubismModelMatrix} from '@cubism/math/cubismmodelmatrix';
import type {CubismModel} from '@cubism/model/cubismmodel';
import type {CubismMotionManager} from '@cubism/motion/cubismmotionmanager';
import type {CubismPhysics} from '@cubism/physics/cubismphysics';

export class Live2DCubismUserModel extends CubismUserModel {
    constructor() {
        super();
    }

    get eyeBlink(): CubismEyeBlink {
        return this._eyeBlink;
    }

    set eyeBlink(value: CubismEyeBlink) {
        this._eyeBlink = value;
    }

    get breath(): CubismBreath {
        return this._breath;
    }

    set breath(value: CubismBreath) {
        this._breath = value;
    }

    get modelMatrix(): CubismModelMatrix {
        return this._modelMatrix;
    }

    get model(): CubismModel {
        return this._model;
    }

    get motionManager(): CubismMotionManager {
        return this._motionManager;
    }

    get expressionManager() {
        return this._expressionManager;
    }

    get physics(): CubismPhysics {
        return this._physics;
    }

    get lipsync() {
        return this._lipsync;
    }

    get pose() {
        return this._pose;
    }
}
