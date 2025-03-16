import {Live2DCanvas, Live2DCanvasContext, Live2DRunner, useTicker} from '@react-live2d';
import {useEffect, useRef} from 'react';

import {ModelPicker} from './ModelPicker';

const ModelViewer = () => {
    const ticker = useTicker();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const updateCanvasSize = () => {
            if (containerRef.current && canvasRef.current) {
                const {offsetWidth, offsetHeight} = containerRef.current;
                canvasRef.current.width = offsetWidth;
                canvasRef.current.height = offsetHeight;
            }
        };

        const observer = new ResizeObserver(updateCanvasSize);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <Live2DRunner ticker={ticker}>
            <Live2DCanvas>
                <div className="flex max-h-screen min-h-screen flex-row">
                    <div className="flex w-96 items-center justify-center bg-blue-800 text-white">
                        <ModelPicker />
                    </div>
                    <div
                        id="canvas-container"
                        ref={containerRef}
                        className="flex flex-1 items-center justify-center overflow-hidden bg-gray-100">
                        <Live2DCanvasContext.Consumer>
                            {({setCanvas}) => (
                                <canvas
                                    className="absolute"
                                    ref={(el) => {
                                        setCanvas(el);
                                        canvasRef.current = el;
                                    }}
                                />
                            )}
                        </Live2DCanvasContext.Consumer>
                    </div>
                </div>
            </Live2DCanvas>
        </Live2DRunner>
    );
};

export default ModelViewer;
