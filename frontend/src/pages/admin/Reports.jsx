import { useState, useEffect } from 'react';
import {
  Download,
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  FileText,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import Loader from '../../components/common/Loader';
import { examService, analyticsService } from '../../services/services';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [filters, setFilters] = useState({
    exam_id: '',
    class_level: '',
    subject_id: '',
    date_from: '',
    date_to: '',
  });

  // Data
  const [exams, setExams] = useState([]);
  const [overviewStats, setOverviewStats] = useState({
    totalExams: 0,
    totalStudents: 0,
    totalResults: 0,
    averageScore: 0,
    passRate: 0,
  });

  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [classPerformance, setClassPerformance] = useState([]);
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [examComparison, setExamComparison] = useState([]);

  useEffect(() => {
    loadExams();
    loadReportData();
  }, [filters]);

  const loadExams = async () => {
    try {
      const response = await examService.getAll();
      setExams(response.data?.exams || response.data || []);
    } catch (error) {
      console.error('Failed to load exams:', error);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);

      // In production, these would be real API calls
      // For now, we'll use mock data

      // Overview Stats
      setOverviewStats({
        totalExams: 48,
        totalStudents: 1000,
        totalResults: 856,
        averageScore: 68.5,
        passRate: 78.3,
      });

      // Performance Trend (last 6 months)
      setPerformanceTrend([
        { month: 'Jun', avgScore: 65, passRate: 72 },
        { month: 'Jul', avgScore: 67, passRate: 75 },
        { month: 'Aug', avgScore: 64, passRate: 70 },
        { month: 'Sep', avgScore: 69, passRate: 77 },
        { month: 'Oct', avgScore: 71, passRate: 80 },
        { month: 'Nov', avgScore: 68, passRate: 78 },
      ]);

      // Class Performance
      setClassPerformance([
        { class: 'JSS1', avgScore: 72, students: 180 },
        { class: 'JSS2', avgScore: 68, students: 175 },
        { class: 'JSS3', avgScore: 70, students: 165 },
        { class: 'SS1', avgScore: 66, students: 160 },
        { class: 'SS2', avgScore: 65, students: 155 },
        { class: 'SS3', avgScore: 67, students: 165 },
      ]);

      // Subject Performance
      setSubjectPerformance([
        { subject: 'Mathematics', avgScore: 65, exams: 8 },
        { subject: 'English', avgScore: 72, exams: 8 },
        { subject: 'Biology', avgScore: 68, exams: 6 },
        { subject: 'Chemistry', avgScore: 63, exams: 6 },
        { subject: 'Physics', avgScore: 61, exams: 6 },
        { subject: 'Economics', avgScore: 70, exams: 4 },
      ]);

      // Grade Distribution
      setGradeDistribution([
        { grade: 'A', count: 145, percentage: 17 },
        { grade: 'B', count: 210, percentage: 25 },
        { grade: 'C', count: 256, percentage: 30 },
        { grade: 'D', count: 145, percentage: 17 },
        { grade: 'E', count: 68, percentage: 8 },
        { grade: 'F', count: 32, percentage: 3 },
      ]);

      // Top Performers
      setTopPerformers([
        { name: 'Adeyemi Oluwaseun', class: 'SS3', avgScore: 96.5, exams: 6 },
        { name: 'Chiamaka Okafor', class: 'SS2', avgScore: 94.8, exams: 7 },
        { name: 'Ibrahim Mohammed', class: 'SS3', avgScore: 93.2, exams: 6 },
        { name: 'Grace Eze', class: 'SS1', avgScore: 92.7, exams: 8 },
        { name: 'Tunde Bakare', class: 'SS2', avgScore: 91.5, exams: 7 },
      ]);

      // Exam Comparison (recent exams)
      setExamComparison([
        { exam: 'Math CA1', avgScore: 68, passRate: 75, students: 156 },
        { exam: 'English CA1', avgScore: 72, passRate: 82, students: 158 },
        { exam: 'Biology Mid', avgScore: 65, passRate: 70, students: 89 },
        { exam: 'Chem CA1', avgScore: 63, passRate: 68, students: 92 },
      ]);

      // Uncomment these when backend is ready:
      // const [overviewRes, trendRes, classRes] = await Promise.all([
      //   analyticsService.getOverview(filters),
      //   analyticsService.getPerformanceTrend(filters),
      //   analyticsService.getClassPerformance(filters),
      // ]);
      // setOverviewStats(overviewRes.data);
      // setPerformanceTrend(trendRes.data);
      // setClassPerformance(classRes.data);
    } catch (error) {
      showAlert('error', error.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportReport = (format) => {
    showAlert('info', `Exporting report as ${format.toUpperCase()}...`);
    // Implementation for export
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <Card
          title="Total Exams"
          value={overviewStats.totalExams}
          icon={FileText}
          className="border-l-4 border-l-blue-500"
        />
        <Card
          title="Total Students"
          value={overviewStats.totalStudents}
          icon={Users}
          className="border-l-4 border-l-green-500"
        />
        <Card
          title="Total Results"
          value={overviewStats.totalResults}
          icon={BarChart3}
          className="border-l-4 border-l-purple-500"
        />
        <Card
          title="Average Score"
          value={`${overviewStats.averageScore}%`}
          icon={TrendingUp}
          className="border-l-4 border-l-yellow-500"
        />
        <Card
          title="Pass Rate"
          value={`${overviewStats.passRate}%`}
          icon={PieChart}
          className="border-l-4 border-l-red-500"
        />
      </div>

      {/* Performance Trend */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Performance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="avgScore"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Average Score"
            />
            <Line
              type="monotone"
              dataKey="passRate"
              stroke="#10b981"
              strokeWidth={2}
              name="Pass Rate %"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Grade Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Grade Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie
                data={gradeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        </div>

        {/* Top Performers */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Top 5 Performers</h3>
          <div className="space-y-3">
            {topPerformers.map((student, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">
                      {student.class} • {student.exams} exams
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{student.avgScore}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderClassPerformance = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Performance by Class Level
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={classPerformance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="class" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgScore" fill="#3b82f6" name="Average Score" />
            <Bar dataKey="students" fill="#10b981" name="Students" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Class Statistics</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Class
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Students
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Avg Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {classPerformance.map((cls) => (
                <tr key={cls.class}>
                  <td className="px-4 py-3 font-medium text-gray-900">{cls.class}</td>
                  <td className="px-4 py-3 text-gray-600">{cls.students}</td>
                  <td className="px-4 py-3 text-gray-900">{cls.avgScore}%</td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${cls.avgScore}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSubjectPerformance = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Performance by Subject
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={subjectPerformance} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="subject" type="category" width={100} />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgScore" fill="#8b5cf6" name="Average Score" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Subject Statistics</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Exams Conducted
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Avg Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Difficulty Level
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subjectPerformance.map((subject) => {
                let difficulty = 'Easy';
                let difficultyColor = 'text-green-600';
                if (subject.avgScore < 65) {
                  difficulty = 'Hard';
                  difficultyColor = 'text-red-600';
                } else if (subject.avgScore < 75) {
                  difficulty = 'Medium';
                  difficultyColor = 'text-yellow-600';
                }

                return (
                  <tr key={subject.subject}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {subject.subject}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{subject.exams}</td>
                    <td className="px-4 py-3 text-gray-900">{subject.avgScore}%</td>
                    <td className={`px-4 py-3 font-medium ${difficultyColor}`}>
                      {difficulty}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderExamComparison = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Exam Comparison</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={examComparison}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="exam" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgScore" fill="#3b82f6" name="Average Score" />
            <Bar dataKey="passRate" fill="#10b981" name="Pass Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Exam Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Exam
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Students
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Avg Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Pass Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {examComparison.map((exam, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 font-medium text-gray-900">{exam.exam}</td>
                  <td className="px-4 py-3 text-gray-600">{exam.students}</td>
                  <td className="px-4 py-3 text-gray-900">{exam.avgScore}%</td>
                  <td className="px-4 py-3 text-gray-900">{exam.passRate}%</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-green-600"
                          style={{ width: `${exam.passRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{exam.passRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <Loader fullScreen text="Loading reports..." />;
  }

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Comprehensive performance analysis and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleExportReport('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="secondary" onClick={() => handleExportReport('excel')}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Filters</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Select
            label="Exam"
            value={filters.exam_id}
            onChange={(e) => setFilters({ ...filters, exam_id: e.target.value })}
            options={[
              { value: '', label: 'All Exams' },
              ...exams.map((exam) => ({
                value: exam.id,
                label: exam.exam_name || exam.examName,
              })),
            ]}
          />

          <Select
            label="Class Level"
            value={filters.class_level}
            onChange={(e) => setFilters({ ...filters, class_level: e.target.value })}
            options={[
              { value: '', label: 'All Classes' },
              ...CLASS_LEVELS.map((level) => ({ value: level, label: level })),
            ]}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() =>
                setFilters({
                  exam_id: '',
                  class_level: '',
                  subject_id: '',
                  date_from: '',
                  date_to: '',
                })
              }
              className="w-full"
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'class', label: 'Class Performance' },
            { id: 'subject', label: 'Subject Performance' },
            { id: 'exam', label: 'Exam Comparison' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'class' && renderClassPerformance()}
      {activeTab === 'subject' && renderSubjectPerformance()}
      {activeTab === 'exam' && renderExamComparison()}
    </div>
  );
};

export default Reports;