import { useState, useEffect } from 'react';
import { BookOpen, Info } from 'lucide-react';
import Table from '../../components/common/Table';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import Badge from '../../components/common/Badge';
import { getSubjects } from '../../services/api';

const SubjectManagement = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        try {
            setLoading(true);
            const response = await getSubjects();
            const subjectsByClass = response.data?.subjects || {};

            // Flatten into table format
            const subjectList = [];
            Object.entries(subjectsByClass).forEach(([classLevel, subjectNames]) => {
                subjectNames.forEach(subject => {
                    subjectList.push({ class: classLevel, subject });
                });
            });

            setSubjects(subjectList);
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to load subjects' });
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: 'subject',
            label: 'Subject Name',
            render: (value) => (
                <span className="font-medium text-gray-900">{value}</span>
            ),
        },
        {
            key: 'class',
            label: 'Class Level',
            render: (value) => (
                <Badge variant="info">{value}</Badge>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: () => (
                <Badge variant="success">Active</Badge>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        View subjects derived from uploaded questions
                    </p>
                </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Auto-generated Subjects</p>
                        <p>
                            Subjects are automatically created when you upload questions in the Question Bank.
                            Each unique subject-class combination appears here.
                        </p>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card
                    title="Total Subjects"
                    value={subjects.length}
                    icon={BookOpen}
                />
                <Card
                    title="Unique Subjects"
                    value={[...new Set(subjects.map(s => s.subject))].length}
                    subtitle="Across all classes"
                />
                <Card
                    title="Classes Covered"
                    value={[...new Set(subjects.map(s => s.class))].length}
                    subtitle="With subjects"
                />
            </div>

            {/* Subjects Table */}
            <div className="card">
                <Table
                    columns={columns}
                    data={subjects}
                    loading={loading}
                    emptyMessage="No subjects found. Upload questions in Question Bank to create subjects."
                />
            </div>

            {/* How it Works */}
            <Card>
                <h3 className="font-semibold text-gray-900 mb-3">How Subjects Work</h3>
                <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 mt-0.5">1.</span>
                        <span>Go to <strong>Question Bank</strong> and upload a CSV with questions</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 mt-0.5">2.</span>
                        <span>Specify the <strong>Subject</strong> and <strong>Class</strong> during upload</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 mt-0.5">3.</span>
                        <span>The system automatically creates an exam for that subject-class combination</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 mt-0.5">4.</span>
                        <span>The subject appears here and can be activated in <strong>Exam Management</strong></span>
                    </li>
                </ol>
            </Card>
        </div>
    );
};

export default SubjectManagement;