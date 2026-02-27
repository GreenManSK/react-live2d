import type {PropsWithChildren} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';

import {Live2DModelManager} from '../cubism/Live2DModelManager';
import {Live2DModelMotionManager} from '../cubism/Live2DModelMotionManager';
import {useLive2DCanvasContext} from '../Live2DCanvas/useLive2DCanvasContext';
import {Live2DModelContext} from './useLive2DModelContext';
import {ZipModelFileSystem} from '../utils/ZipModelFileSystem';

export type HitZoneEvent = {
    /** Names of all hit areas that contain the clicked point. */
    hitAreas: string[];
    /** The original DOM mouse event. */
    originalEvent: MouseEvent;
    /** Call to stop the original click event from propagating. */
    preventDefault: () => void;
};

export type Props = {
    /** URL or path to the .model3.json settings file. Required unless modelZipPath is provided. */
    modelJsonPath?: string;
    /** URL or path to a .zip archive containing the model and all its assets. Required unless modelJsonPath is provided. */
    modelZipPath?: string;
    scale?: number;
    positionX?: number;
    positionY?: number;
    /** Called when a hit zone is clicked. If omitted, hit zone detection is disabled. */
    onHitZone?: (event: HitZoneEvent) => void;
    /** Draw bounding-box outlines for all defined hit areas on the canvas. Default: false. */
    showHitAreas?: boolean;
    /** Called once the model has finished loading and is ready to render. */
    onLoad?: () => void;
    /** Called if loading the model fails. Receives the error that caused the failure. */
    onError?: (error: Error) => void;
};

export const Live2DModel = ({
    modelJsonPath,
    modelZipPath,
    scale,
    positionX,
    positionY,
    onHitZone,
    showHitAreas,
    onLoad,
    onError,
    children,
}: PropsWithChildren<Props>) => {
    const [modelManager, setModelManager] = useState<Live2DModelManager | null>(null);
    const {gl, textureManager, addModel, removeModel, canvas} = useLive2DCanvasContext();
    const onLoadRef = useRef(onLoad);
    onLoadRef.current = onLoad;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;
    useEffect(() => {
        if (!gl || !textureManager) {
            return;
        }
        const loadPromise = modelZipPath
            ? ZipModelFileSystem.fromUrl(modelZipPath).then(({fs, modelJsonBuffer}) =>
                  Live2DModelManager.getModelManagerFromFileSystem(modelJsonBuffer, fs, gl, textureManager)
              )
            : modelJsonPath
              ? Live2DModelManager.getModelManager(modelJsonPath, gl, textureManager)
              : Promise.reject(new Error('Either modelJsonPath or modelZipPath must be provided'));

        loadPromise
            .then((manager) => manager.loadModel())
            .then((finishedModelManager) => {
                setModelManager(finishedModelManager);
                onLoadRef.current?.();
            })
            .catch((error: unknown) => {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('Failed to load Live2D model:', err);
                onErrorRef.current?.(err);
            });
    }, [modelJsonPath, modelZipPath, gl, textureManager]);
    useEffect(() => {
        if (!modelManager) {
            return;
        }
        addModel(modelManager);
        return () => {
            removeModel(modelManager);
            modelManager.dispose();
        };
    }, [modelManager, addModel, removeModel]);
    useEffect(() => {
        if (!modelManager || scale === undefined) {
            return;
        }
        modelManager.setScale(scale);
    }, [modelManager, scale]);
    useEffect(() => {
        if (!modelManager || (positionX === undefined && positionY === undefined)) {
            return;
        }
        modelManager.setPosition(positionX ?? 0.0, positionY ?? 0.0);
    }, [modelManager, positionX, positionY]);

    useEffect(() => {
        if (!modelManager || showHitAreas === undefined) {
            return;
        }
        modelManager.setShowHitAreas(showHitAreas);
    }, [modelManager, showHitAreas]);

    useEffect(() => {
        if (!canvas || !modelManager || !onHitZone) {
            return;
        }
        const handleClick = (e: MouseEvent) => {
            const pageX = e.clientX + window.scrollX;
            const pageY = e.clientY + window.scrollY;
            const hitAreas = modelManager.hitTest(pageX, pageY);
            if (hitAreas.length === 0) {
                return;
            }
            onHitZone({hitAreas, originalEvent: e, preventDefault: () => e.preventDefault()});
        };
        canvas.addEventListener('click', handleClick);
        return () => canvas.removeEventListener('click', handleClick);
    }, [canvas, modelManager, onHitZone]);

    const contextValue = useMemo(
        () => ({
            motionManager: modelManager ? new Live2DModelMotionManager(modelManager) : undefined,
        }),
        [modelManager]
    );
    return <Live2DModelContext.Provider value={contextValue}>{children}</Live2DModelContext.Provider>;
};
