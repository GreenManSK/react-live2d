import type {PropsWithChildren} from 'react';
import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {CubismFramework, Option as CubismOption, LogLevel} from '@cubism/live2dcubismframework';
import * as CubismRenderingWebgl from '@cubism/rendering/cubismrenderer_webgl';

import type {ITicker} from '../Ticker/ticker.interface';
import type {ILive2DCanvas} from '../cubism/Live2DCanvas.interface';

if (CubismRenderingWebgl) {
    // Needed for CubismFramework.dispose to work correctly
    console.debug('CubismRenderingWebgl loaded');
}

export type Live2DRunnerProps = {
    cubismOptions?: CubismOption;
    ticker: ITicker;
};

export type Live2DRunnerContext = {
    registerCanvas: (canvas: ILive2DCanvas) => void;
    unregisterCanvas: (canvas: ILive2DCanvas) => void;
};

const Live2DRunnerContext = createContext<Live2DRunnerContext>({
    registerCanvas: () => {},
    unregisterCanvas: () => {},
});

export const useLive2DRunnerContext = () => useContext(Live2DRunnerContext);

export const Live2DRunner = ({cubismOptions, ticker, children}: PropsWithChildren<Live2DRunnerProps>) => {
    const [isStarted, setIsStarted] = useState(CubismFramework.isStarted());
    const canvasList = useRef<ILive2DCanvas[]>([]);

    useEffect(() => {
        if (CubismFramework.isStarted()) {
            setIsStarted(true);
            return;
        }
        const finalCubismOptions = cubismOptions || new CubismOption();
        if (!cubismOptions) {
            finalCubismOptions.loggingLevel = LogLevel.LogLevel_Verbose;
            finalCubismOptions.logFunction = console.log;
        }
        CubismFramework.startUp(finalCubismOptions);
        CubismFramework.initialize();
        setIsStarted(true);

        // return () => {
        //     // TODO: maybe will cause issues
        //     // if (CubismFramework.isStarted()) {
        //     //     CubismFramework.dispose();
        //     //     setIsStarted(false);
        //     // }
        // };
    }, [cubismOptions]);

    const renderLoop = useCallback(() => {
        let shouldStop = false;
        const render = () => {
            ticker.updateTime();
            canvasList.current.forEach((canvas) => canvas.render(ticker.getDeltaTime()));
            if (!shouldStop) {
                requestAnimationFrame(render);
            }
        };
        requestAnimationFrame(render);
        return () => (shouldStop = true);
    }, [ticker]);

    useEffect(() => {
        if (isStarted) {
            const dispose = renderLoop();
            return () => dispose();
        }
        return () => {};
    }, [isStarted, renderLoop]);

    const registerCanvas = useCallback((canvas: ILive2DCanvas) => {
        canvasList.current.push(canvas);
    }, []);
    const unregisterCanvas = useCallback((canvas: ILive2DCanvas) => {
        const index = canvasList.current.indexOf(canvas);
        if (index !== -1) {
            canvasList.current.splice(index, 1);
        }
    }, []);

    return (
        <Live2DRunnerContext.Provider value={{registerCanvas, unregisterCanvas}}>
            {children}
        </Live2DRunnerContext.Provider>
    );
};
