import type {BeganMotionCallback, FinishedMotionCallback} from '@cubism/motion/acubismmotion';

import type {Live2DModelManager} from './Live2DModelManager';

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

    public setLookTarget(x: number, y: number): void {
        this.modelManager.setLookTarget(x, y);
    }
}
