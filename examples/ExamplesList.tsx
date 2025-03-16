import {NavLink} from 'react-router';

const ExamplesList = () => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <h1 className="mb-6 text-4xl font-bold text-blue-800">Live2D Example</h1>
            <ul className="space-y-4">
                <li>
                    <NavLink to="/model-viewer" className="text-lg hover:underline">
                        Model Viewer
                    </NavLink>
                </li>
            </ul>
        </div>
    );
};

export default ExamplesList;
