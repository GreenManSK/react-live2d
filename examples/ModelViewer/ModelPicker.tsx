import {Live2DModel} from '@react-live2d';
import type {HitZoneEvent} from '@react-live2d';
import {useCallback, useState} from 'react';

import {ModelControls} from './ModelControls';

export const ModelPicker = () => {
    const models = ['Haru', 'Hiyori', 'Mao', 'Mark', 'Natori', 'Rice', 'Wanko', 'fern', 'mikumiku', 'L2DZeroVS'];
    const [modelJson, setModelJson] = useState('./models/Haru/Haru.model3.json');
    const [hitZonesEnabled, setHitZonesEnabled] = useState(false);
    const [lastHitAreas, setLastHitAreas] = useState<string[]>([]);

    const handleHitZone = useCallback((event: HitZoneEvent) => {
        setLastHitAreas(event.hitAreas);
    }, []);

    return (
        <div className="flex flex-col gap-4 p-4">
            <Live2DModel modelJsonPath={modelJson} onHitZone={hitZonesEnabled ? handleHitZone : undefined}>
                <h2 className="block text-xl font-bold">Model Picker</h2>
                <div className="flex flex-wrap gap-2">
                    {models.map((model) => (
                        <button
                            key={model}
                            onClick={() => setModelJson(`./models/${model}/${model}.model3.json`)}
                            className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600">
                            {model}
                        </button>
                    ))}
                </div>
                <ModelControls
                    hitZonesEnabled={hitZonesEnabled}
                    onToggleHitZones={setHitZonesEnabled}
                    lastHitAreas={lastHitAreas}
                />
            </Live2DModel>
        </div>
    );
};
