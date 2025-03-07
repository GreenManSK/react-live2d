import {useEffect, useRef, type PropsWithChildren} from 'react';

import styles from './Live2DCanvas.module.css';
import {useLive2DRunnerContext} from '../Live2DRunner/Live2DRunner';

export type Live2DCanvasProps = {
    width: number;
    height: number;
};

export const Live2DCanvas = ({children, width, height}: PropsWithChildren<Live2DCanvasProps>) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const {registerCanvas, unregisterCanvas} = useLive2DRunnerContext();
    useEffect(() => {
        const live2DCanvas = {
            render: (_deltaTime: number) => {},
            dispose: () => {},
        };
        registerCanvas(live2DCanvas);
        return () => unregisterCanvas(live2DCanvas);
    }, [registerCanvas, unregisterCanvas]);
    return (
        <canvas width={width} height={height} ref={canvasRef} className={styles.canvas}>
            {children}
        </canvas>
    );
};
