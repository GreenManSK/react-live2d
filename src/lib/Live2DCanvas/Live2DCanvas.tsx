import {useCallback, useEffect, useState, type FC} from 'react';
import {CubismFramework, Option as CubismOption, LogLevel} from '@cubism/live2dcubismframework';
import * as CubismRenderingWebgl from '@cubism/rendering/cubismrenderer_webgl';

import type {ITicker} from '../Ticker/ticker.interface';
import styles from './Live2DCanvas.module.css';

if (CubismRenderingWebgl) {
    // Needed for CubismFramework.dispose to work correctly
    console.debug('CubismRenderingWebgl loaded');
}

export type Props = {
    cubismOptions?: CubismOption;
    ticker: ITicker;
};

export const Live2DCanvas: FC<Props> = ({cubismOptions, ticker}) => {
    const [isStarted, setIsStarted] = useState(false);

    useEffect(() => {
        if (CubismFramework.isStarted()) {
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

        return () => {
            if (CubismFramework.isStarted()) {
                CubismFramework.dispose();
                setIsStarted(false);
            }
        };
    }, [cubismOptions]);

    const renderLoop = useCallback(() => {
        let shouldStop = false;
        const render = () => {
            ticker.updateTime();
            if (!shouldStop) {
                render();
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

    return <canvas id="live2d" width={500} height={500} className={styles['live-2-d-canvas']} />;
};
