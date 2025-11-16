import { useState, useEffect } from 'react';
import { Network, Copy, CheckCircle, Wifi, Server } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';

const NetworkInfo = () => {
    const [networkAddresses, setNetworkAddresses] = useState([]);
    const [copiedAddress, setCopiedAddress] = useState('');
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        loadNetworkInfo();
    }, []);

    const loadNetworkInfo = async () => {
        // Check if running in Electron
        if (window.electronAPI && window.electronAPI.getNetworkInfo) {
            try {
                const addresses = await window.electronAPI.getNetworkInfo();
                setNetworkAddresses(addresses);
            } catch (error) {
                console.error('Failed to get network info:', error);
            }
        } else {
            // Fallback for browser/development
            setNetworkAddresses([
                { name: 'Local Network', address: 'localhost:5000' },
                { name: 'Note', address: 'Network info available in desktop app only' }
            ]);
        }
    };

    const copyToClipboard = (address) => {
        const fullAddress = `http://${address}:5000`;
        navigator.clipboard.writeText(fullAddress);
        setCopiedAddress(address);
        setAlert({ type: 'success', message: `Address copied: ${fullAddress}` });

        setTimeout(() => {
            setCopiedAddress('');
        }, 2000);
    };

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Network Setup</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Connect student computers to the exam server
                </p>
            </div>

            {/* Instructions */}
            <Card>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Wifi className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-2">📡 How to Connect Student Computers</p>
                            <ol className="space-y-2 ml-4 list-decimal">
                                <li>Make sure all computers are on the <strong>same Wi-Fi network</strong></li>
                                <li>Copy one of the server addresses below</li>
                                <li>On each student computer, open a web browser (Chrome, Edge, Firefox)</li>
                                <li>Type or paste the server address in the browser</li>
                                <li>Students will see the exam login page</li>
                                <li>Students can login with their exam codes and passwords</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Server Addresses */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Server className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold">Server Addresses</h3>
                </div>

                {networkAddresses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Network className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Loading network information...</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {networkAddresses.map((net, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Network className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="font-medium text-gray-900">{net.name}</p>
                                        <p className="text-sm font-mono text-blue-600">
                                            http://{net.address}:5000
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(net.address)}
                                >
                                    {copiedAddress === net.address ? (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                        <strong>Tip:</strong> Use the address that matches your network adapter.
                        If students can't connect, try a different address or check firewall settings.
                    </p>
                </div>
            </Card>

            {/* Troubleshooting */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Troubleshooting Connection Issues</h3>
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-2">1. Students can't access the server</h4>
                        <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                            <li>Verify all computers are on the same Wi-Fi network</li>
                            <li>Check Windows Firewall settings (may need to allow port 5000)</li>
                            <li>Try accessing from this computer first: <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:5000</code></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-900 mb-2">2. Firewall Configuration</h4>
                        <p className="text-sm text-gray-700 mb-2">If Windows Firewall is blocking connections:</p>
                        <ol className="text-sm text-gray-700 space-y-1 ml-4 list-decimal">
                            <li>Open "Windows Defender Firewall"</li>
                            <li>Click "Allow an app through firewall"</li>
                            <li>Find "Molek CBT System" and check both Private and Public</li>
                            <li>Or manually allow port 5000 (TCP)</li>
                        </ol>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-900 mb-2">3. Network Requirements</h4>
                        <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                            <li>Router/Wi-Fi access point required</li>
                            <li>All computers must be on same network (same Wi-Fi name)</li>
                            <li>No internet required (local network only)</li>
                        </ul>
                    </div>
                </div>
            </Card>

            {/* Admin Access */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Admin Access</h3>
                <p className="text-sm text-gray-700 mb-3">
                    To access the admin panel from another computer on the network:
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-mono text-blue-600 text-sm">
                        http://[SERVER-ADDRESS]:5000/admin
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                        Replace [SERVER-ADDRESS] with one of the addresses listed above
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default NetworkInfo;