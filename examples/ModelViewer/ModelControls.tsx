import {useLive2DModelContext} from '@react-live2d';
import {useEffect, useState} from 'react';

export const ModelControls = () => {
    const {motionManager} = useLive2DModelContext();

    const [lookAtMouse, setLookAtMouse] = useState(true);
    const [lookAtX, setLookAtX] = useState(0);
    const [lookAtY, setLookAtY] = useState(0);

    const [bodyFaceMouse, setBodyFaceMouse] = useState(true);
    const [bodyX, setBodyX] = useState(0);
    const [bodyY, setBodyY] = useState(0);

    const [scale, setScale] = useState(1.0);
    const [positionX, setPositionX] = useState(0.0);
    const [positionY, setPositionY] = useState(0.0);

    useEffect(() => {
        if (!motionManager || lookAtMouse) {
            return;
        }
        motionManager.setLookTargetRelative(lookAtX, lookAtY, 0);
    }, [motionManager, lookAtX, lookAtY, lookAtMouse]);

    useEffect(() => {
        if (!motionManager || bodyFaceMouse) {
            return;
        }
        motionManager.setBodyOrientationTargetRelative(bodyX, bodyY, 0);
    }, [motionManager, bodyX, bodyY, bodyFaceMouse]);

    useEffect(() => {
        if (!motionManager) {
            return;
        }
        motionManager.setScale(scale);
    }, [motionManager, scale]);

    useEffect(() => {
        if (!motionManager) {
            return;
        }
        motionManager.setPosition(positionX, positionY);
    }, [motionManager, positionX, positionY]);

    useEffect(() => {
        if (!motionManager) {
            return;
        }
        const handleMouseMove = (event: MouseEvent) => {
            if (!motionManager) {
                return;
            }
            const x = event.clientX + window.scrollX;
            const y = event.clientY + window.scrollY;
            if (lookAtMouse) {
                motionManager.setLookTarget(x, y, 0);
            }
            if (bodyFaceMouse) {
                motionManager.setBodyOrientationTarget(x, y, 0);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [motionManager, lookAtMouse, bodyFaceMouse]);

    if (!motionManager) {
        return null;
    }

    const expressions = motionManager.getExpressionsList();
    const motionGroups = [...motionManager.getMotionGroups().entries()];

    return (
        <>
            <h2 className="block text-xl font-bold">Model Controls</h2>
            <h3 className="block text-lg font-bold">Expressions ({expressions.length})</h3>
            <div className="flex flex-wrap gap-2">
                {expressions.map((expression) => (
                    <button
                        key={expression}
                        className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600"
                        onClick={() => motionManager.setExpression(expression)}>
                        {expression}
                    </button>
                ))}
            </div>
            <h3 className="block text-lg font-bold">Motion Groups ({motionGroups.length})</h3>
            <div className="flex flex-col gap-2">
                {motionGroups.map(([groupName, ids]) => (
                    <div key={groupName}>
                        <h4 className="text-md block font-bold">
                            {groupName} ({ids})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {Array.from({length: ids}, (_, i) => i).map((id) => (
                                <button
                                    key={id}
                                    className="cursor-pointer rounded bg-green-500 px-4 py-2 text-white transition hover:bg-green-600"
                                    onClick={() => motionManager.setMotion(groupName, id)}>
                                    {id}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <h3 className="block text-lg font-bold">Look</h3>
            <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={lookAtMouse}
                        onChange={(e) => {
                            const value = e.target.checked;
                            setLookAtMouse(value);
                        }}
                    />
                    Follow mouse
                </label>
                <label className="flex items-center gap-2">
                    X:
                    <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.01}
                        value={lookAtX}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setLookAtX(value);
                        }}
                    />
                    {lookAtX}
                </label>
                <label className="flex items-center gap-2">
                    Y:
                    <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.01}
                        value={lookAtY}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setLookAtY(value);
                        }}
                    />
                    {lookAtY}
                </label>
            </div>
            <h3 className="block text-lg font-bold">Body orientation</h3>
            <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={bodyFaceMouse}
                        onChange={(e) => {
                            const value = e.target.checked;
                            setBodyFaceMouse(value);
                        }}
                    />
                    Follow mouse
                </label>
                <label className="flex items-center gap-2">
                    X:
                    <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.01}
                        value={bodyX}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setBodyX(value);
                        }}
                    />
                    {bodyX}
                </label>
                <label className="flex items-center gap-2">
                    Y:
                    <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.01}
                        value={bodyY}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setBodyY(value);
                        }}
                    />
                    {bodyY}
                </label>
            </div>
            <h3 className="block text-lg font-bold">Scale & Position</h3>
            <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2">
                    Scale:
                    <input
                        type="range"
                        min={0.1}
                        max={3}
                        step={0.01}
                        value={scale}
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                    />
                    {scale.toFixed(2)}
                </label>
                <label className="flex items-center gap-2">
                    X:
                    <input
                        type="range"
                        min={-2}
                        max={2}
                        step={0.01}
                        value={positionX}
                        onChange={(e) => setPositionX(parseFloat(e.target.value))}
                    />
                    {positionX.toFixed(2)}
                </label>
                <label className="flex items-center gap-2">
                    Y:
                    <input
                        type="range"
                        min={-2}
                        max={2}
                        step={0.01}
                        value={positionY}
                        onChange={(e) => setPositionY(parseFloat(e.target.value))}
                    />
                    {positionY.toFixed(2)}
                </label>
            </div>
        </>
    );
};
