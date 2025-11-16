import { useState } from 'react';
import { Users, AlertCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';

const UserManagement = () => {
    const [alert] = useState({
        type: 'info',
        message: 'User management feature will be available in a future update. Currently, admin access is open (localhost only).'
    });

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => {}} />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Manage system administrators and teachers
                    </p>
                </div>
            </div>

            {/* Feature Coming Soon */}
            <Card>
                <div className="text-center py-12">
                    <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        User Management Coming Soon
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                        This feature will allow you to create and manage multiple admin users with different permission levels.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center justify-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Current Setup
                        </h4>
                        <ul className="text-sm text-blue-800 space-y-1 text-left">
                            <li>• Admin access: Open on localhost (no login required)</li>
                            <li>• Student access: Exam code + password authentication</li>
                            <li>• Recommendation: Keep admin access to trusted networks only</li>
                        </ul>
                    </div>
                </div>
            </Card>

            {/* System Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card
                    title="Current Admin"
                    value="1"
                    subtitle="Open access (localhost)"
                />
                <Card
                    title="Security Level"
                    value="Network"
                    subtitle="Localhost only"
                />
                <Card
                    title="Future Feature"
                    value="Multi-user"
                    subtitle="Role-based access"
                />
            </div>
        </div>
    );
};

export default UserManagement;