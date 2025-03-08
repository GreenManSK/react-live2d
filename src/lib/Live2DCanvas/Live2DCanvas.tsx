import type {Ref} from 'react';
import {createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren} from 'react';

import styles from './Live2DCanvas.module.css';
import {useLive2DRunnerContext} from '../Live2DRunner/Live2DRunner';
import type {Live2DTextureManager} from '../cubism/Live2DTextureManager';
import type {Live2DModelManager} from '../cubism/Live2DModelManager';
import {Live2DCanvasManager} from '../cubism/Live2DCanvasManager';

export type Live2DCanvasProps = {
    width: number;
    height: number;
};

export type ILive2DCanvasContext = {
    gl?: WebGL2RenderingContext;
    canvas: Ref<HTMLCanvasElement | null>;
    textureManager?: Live2DTextureManager;
    addModel: (model: Live2DModelManager) => void;
    removeModel: (model: Live2DModelManager) => void;
};

const defaultCanvasContext: ILive2DCanvasContext = {
    gl: undefined,
    canvas: {current: null},
    textureManager: undefined,
    addModel: () => {},
    removeModel: () => {},
};

const Live2DCanvasContext = createContext<ILive2DCanvasContext>(defaultCanvasContext);

export const useLive2DCanvasContext = () => useContext(Live2DCanvasContext);

export const Live2DCanvas = ({children, width, height}: PropsWithChildren<Live2DCanvasProps>) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvasManager = useRef<Live2DCanvasManager>(undefined);
    const [gl, setGl] = useState<WebGL2RenderingContext | undefined>(undefined);

    const {registerCanvas, unregisterCanvas} = useLive2DRunnerContext();
    useEffect(() => {
        const gl = canvasRef.current?.getContext('webgl2');
        if (gl) {
            setGl(gl);
            canvasManager.current = new Live2DCanvasManager(gl);
            if (canvasRef.current) {
                canvasManager.current.setup(canvasRef.current);
            } else {
                console.error('Live2DCanvas: Canvas is not available');
            }
            registerCanvas(canvasManager.current);
        }

        return () => {
            if (!canvasManager.current) {
                return;
            }
            unregisterCanvas(canvasManager.current);
            canvasManager.current.dispose();
        };
    }, [registerCanvas, unregisterCanvas]);

    useEffect(() => {
        if (!gl) {
            return;
        }
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }, [gl]);

    const canvasContext = useMemo(() => {
        if (!gl || !canvasRef.current) {
            return defaultCanvasContext;
        }

        return {
            gl: gl,
            canvas: canvasRef,
            textureManager: canvasManager.current?.textureManager,
            addModel: (model: Live2DModelManager) => {
                canvasManager.current?.addModel(model);
            },
            removeModel: (model: Live2DModelManager) => {
                canvasManager.current?.removeModel(model);
            },
        };
    }, [gl]);

    return (
        <Live2DCanvasContext.Provider value={canvasContext}>
            <canvas width={width} height={height} ref={canvasRef} className={styles.canvas}>
                {children}
            </canvas>
        </Live2DCanvasContext.Provider>
    );
};
