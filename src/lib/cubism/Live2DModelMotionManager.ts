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

    /**
     * Start lip sync driven by an audio file at the given URL (WAV or MP3).
     * The audio plays through the browser's speakers while its amplitude drives
     * the model's mouth in real time.
     */
    public startLipSyncFromFile(url: string): Promise<void> {
        return this.modelManager.startLipSyncFromUrl(url);
    }

    /**
     * Start lip sync from an ArrayBuffer (e.g. from a user-uploaded file).
     * Handles WAV and MP3 formats.
     */
    public startLipSyncFromBuffer(buffer: ArrayBuffer): Promise<void> {
        return this.modelManager.startLipSyncFromBuffer(buffer);
    }

    /** Stop audio-driven lip sync. Reverts to manual control. */
    public stopLipSync(): void {
        this.modelManager.stopLipSync();
    }

    /** Returns true while audio is playing and driving the mouth parameter. */
    public isSpeaking(): boolean {
        return this.modelManager.isSpeaking();
    }

    /**
     * Play a motion and, if the motion has a sound file defined in the model,
     * simultaneously start audio-driven lip sync from that sound file.
     */
    public setMotionWithSound(
        groupName: string,
        id: number,
        priority = 2,
        onFinishedMotionHandler?: () => void,
        onBeganMotionHandler?: () => void
    ): void {
        const soundUrl = this.modelManager.getMotionSoundUrl(groupName, id);
        if (soundUrl) {
            this.modelManager.startLipSyncFromUrl(soundUrl).catch((err) => {
                console.warn(`Live2D: failed to load motion sound "${soundUrl}":`, err);
            });
        }
        this.setMotion(groupName, id, priority, onFinishedMotionHandler, onBeganMotionHandler);
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

    public setScale(scale: number): void {
        this.modelManager.setScale(scale);
    }

    public setPosition(x: number, y: number): void {
        this.modelManager.setPosition(x, y);
    }

    public getHitAreaNames(): string[] {
        return this.modelManager.getHitAreaNames();
    }

    /**
     * Hit-test the model at the given page coordinates.
     * pageX/pageY should be absolute page coordinates (event.clientX + window.scrollX).
     * Returns the names of all hit areas that contain the point.
     */
    public hitTest(pageX: number, pageY: number): string[] {
        return this.modelManager.hitTest(pageX, pageY);
    }

    /** Draw bounding-box overlays for all defined hit areas on the canvas. */
    public setShowHitAreas(show: boolean): void {
        this.modelManager.setShowHitAreas(show);
    }
}
