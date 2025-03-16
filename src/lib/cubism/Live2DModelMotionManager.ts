import type {BeganMotionCallback, FinishedMotionCallback} from '@cubism/motion/acubismmotion';

import type {Live2DModelManager} from './Live2DModelManager';

// TODO: This needs complete refactoring
export class Live2DModelMotionManager {
    public constructor(private readonly modelManager: Live2DModelManager) {}

    public setExpression(name: string): void {
        const expression = this.modelManager.getExpression(name);
        console.log('exp', expression);
        if (expression) {
            this.modelManager.getModel().expressionManager.startMotion(expression, false);
        }
    }

    public getExpressionsList() {
        return this.modelManager.getExpressionsList();
    }

    // TODO: Enum for priority
    public setMotion(
        groupName: string,
        id: number,
        priority = 2,
        onFinishedMotionHandler?: FinishedMotionCallback,
        onBeganMotionHandler?: BeganMotionCallback
    ) {
        const motion = this.modelManager.getMotion(groupName, id);
        if (!motion) {
            return;
        }
        motion.setBeganMotionHandler(onBeganMotionHandler ?? (() => {}));
        motion.setFinishedMotionHandler(onFinishedMotionHandler ?? (() => {}));
        this.modelManager.getModel().motionManager.startMotion(motion, false, priority);
    }

    public getMotionGroups() {
        return this.modelManager.getMotionGroups();
    }

    // speed = 0 means instant
    public setLookTarget(x: number, y: number, speedPerS = 0): void {
        this.modelManager.setLookTarget(x, y, speedPerS);
    }

    // x and y are in the range of -1 to 1
    public setLookTargetRelative(x: number, y: number, speedPerS = 0): void {
        this.modelManager.setLookTargetRelative(x, y, speedPerS);
    }

    public setBodyOrientationTarget(x: number, y: number, speedPerS = 0): void {
        this.modelManager.setBodyOrientationTarget(x, y, speedPerS);
    }
    public setBodyOrientationTargetRelative(x: number, y: number, speedPerS = 0): void {
        this.modelManager.setBodyOrientationTargetRelative(x, y, speedPerS);
    }

    public setLipValue(value: number, speedPerS = 0): void {
        this.modelManager.setLipValue(value, speedPerS);
    }
}
