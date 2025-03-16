import {Live2DModel} from '@react-live2d';
import {useState} from 'react';

export const ModelPicker = () => {
    const models = ['Haru', 'Hiyori', 'Mao', 'Mark', 'Natori', 'Rice', 'Wanko', 'fern', 'mikumiku', 'L2DZeroVS'];
    const [modelJson, setModelJson] = useState('./models/Haru/Haru.model3.json');

    return (
        <div className="flex flex-wrap gap-4 p-4">
            <Live2DModel modelJsonPath={modelJson} />
            {models.map((model) => (
                <button
                    key={model}
                    onClick={() => setModelJson(`./models/${model}/${model}.model3.json`)}
                    className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600">
                    {model}
                </button>
            ))}
        </div>
    );
};
