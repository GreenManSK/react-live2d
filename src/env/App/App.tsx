import type {FC} from 'react';
import {useState, useEffect} from 'react';

import './index.css';
import {Live2DRunner} from '@/lib/Live2DRunner';
import {useTicker} from '@/lib/Ticker/useTicker';
import {Live2DCanvas} from '@/lib/Live2DCanvas';
import {Live2DModel} from '@/lib/Live2DModel';
import {useLive2DModelContext} from '@/lib/Live2DModel/Live2DModel';

type Expression = {
    name: string;
    callback: () => void;
};

type Motion = {
    group: string;
    id: number;
    callback: () => void;
};

type Live2DDataSetterProps = {
    setExpressions: (expressions: Expression[]) => void;
    setMotions: (motions: Motion[]) => void;
};

const Live2DDataSetter: FC<Live2DDataSetterProps> = ({setExpressions, setMotions}) => {
    const {motionManager} = useLive2DModelContext();
    useEffect(() => {
        if (!motionManager) {
            return;
        }
        const expressions = motionManager.getExpressionsList().map((expression) => ({
            name: expression,
            callback: () => {
                motionManager.setExpression(expression);
            },
        }));
        setExpressions(expressions);

        const motionGroups = [...motionManager.getMotionGroups().entries()];
        const motions: Motion[] = [];
        for (const [groupName, ids] of motionGroups) {
            for (let i = 0; i < ids; i++) {
                motions.push({
                    group: groupName,
                    id: i,
                    callback: () => {
                        motionManager.setMotion(groupName, i);
                    },
                });
            }
        }
        setMotions(motions);
    }, [motionManager, setExpressions, setMotions]);

    // Add mouse listener on window to get x and y mouse coordinates
    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!motionManager) {
                return;
            }
            const x = event.clientX + window.scrollX;
            const y = event.clientY + window.scrollY;
            motionManager.setLookTarget(x, y, 5);
        };

        window.addEventListener('click', handleMouseMove);

        return () => {
            window.removeEventListener('click', handleMouseMove);
        };
    }, [motionManager]);
    return <></>;
};

const Live2D = ({modelJson}: {modelJson: string}) => {
    const ticker = useTicker();
    const [expressions, setExpressions] = useState<Expression[]>([]);
    const [motions, setMotions] = useState<Motion[]>([]);
    return (
        <>
            <div>
                {expressions.map((expressions) => (
                    <button key={expressions.name} onClick={expressions.callback}>
                        {expressions.name}
                    </button>
                ))}
            </div>
            <div>
                {motions.map((motion) => (
                    <button key={`${motion.group}_${motion.id}`} onClick={motion.callback}>
                        {motion.group} {motion.id}
                    </button>
                ))}
            </div>
            <Live2DRunner ticker={ticker}>
                <Live2DCanvas width={700} height={1000}>
                    <Live2DModel modelJsonPath={modelJson}>
                        <Live2DDataSetter setExpressions={setExpressions} setMotions={setMotions} />
                    </Live2DModel>
                </Live2DCanvas>
            </Live2DRunner>
        </>
    );
};

const App: FC = () => {
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
        script.async = true;
        script.onload = () => {
            setIsScriptLoaded(true);
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const models = ['Haru', 'Hiyori', 'Mao', 'Mark', 'Natori', 'Rice', 'Wanko', 'fern', 'mikumiku', 'L2DZeroVS'];
    const [modelJson, setModelJson] = useState('public/models/Haru/Haru.model3.json');

    return (
        <div>
            <div>
                <button onClick={() => setIsScriptLoaded(!isScriptLoaded)}>Toggle is loaded</button>
            </div>
            <div>
                {models.map((model) => (
                    <button key={model} onClick={() => setModelJson(`public/models/${model}/${model}.model3.json`)}>
                        {model}
                    </button>
                ))}
                <button onClick={() => setModelJson('public/models/shizuku/shizuku.model.json')}>Shizuku Old</button>
            </div>
            {isScriptLoaded && <Live2D modelJson={modelJson} />}
        </div>
    );
};

const App2 = () => {
    return (
        <>
            <App />
            {/* <App /> */}
        </>
    );
};

export default App2;
