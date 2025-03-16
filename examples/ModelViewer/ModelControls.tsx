import {useLive2DModelContext} from '@react-live2d';

export const ModelControls = () => {
    const {motionManager} = useLive2DModelContext();
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
        </>
    );
};
