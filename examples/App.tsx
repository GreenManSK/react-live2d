import './index.css';

const App = () => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-300">
            <h1 className="mb-6 text-4xl font-bold text-blue-800">Live2D Example</h1>
            <ul className="space-y-4">
                <li>
                    <a href="#e1" className="text-lg hover:underline">
                        Example 1
                    </a>
                </li>
                <li>
                    <a href="#e1" className="text-lg hover:underline">
                        Example 2
                    </a>
                </li>
                <li>
                    <a href="#e1" className="text-lg hover:underline">
                        Example 3
                    </a>
                </li>
                <li>
                    <a href="#e1" className="text-lg hover:underline">
                        Example 4
                    </a>
                </li>
            </ul>
        </div>
    );
};

export default App;
