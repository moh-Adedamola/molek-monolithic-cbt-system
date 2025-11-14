import { useState, useEffect } from 'react';
import {
  Save,
  Settings,
  Shield,
  Mail,
  Bell,
  Database,
  Clock,
  Globe,
  Lock,
  FileText,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import TextArea from '../../components/common/TextArea';
import Alert from '../../components/common/Alert';
import Loader from '../../components/common/Loader';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetSection, setResetSection] = useState('');

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    schoolName: 'Molek Secondary School',
    schoolCode: 'MSS',
    schoolAddress: '123 Education Street, Lagos, Nigeria',
    schoolPhone: '+234 800 000 0000',
    schoolEmail: 'admin@molekschool.edu.ng',
    schoolWebsite: 'https://molekschool.edu.ng',
    academicYear: '2024/2025',
    currentTerm: 'First Term',
  });

  // Exam Settings
  const [examSettings, setExamSettings] = useState({
    defaultDuration: 60,
    defaultPassingScore: 50,
    allowLateSubmission: false,
    lateSubmissionPenalty: 10,
    autoGrading: true,
    showResultsImmediately: false,
    allowExamReview: true,
    shuffleQuestions: true,
    shuffleOptions: true,
    preventTabSwitch: true,
    maxTabSwitches: 3,
    enableProctoring: false,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
    passwordExpiryDays: 90,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    twoFactorAuth: false,
    ipWhitelist: '',
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    examPublishedNotification: true,
    resultPublishedNotification: true,
    examReminderNotification: true,
    reminderBeforeExam: 24,
    alertAdminOnSuspiciousActivity: true,
    alertTeacherOnExamStart: true,
  });

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpSecure: true,
    emailFromName: 'Molek School',
    emailFromAddress: 'noreply@molekschool.edu.ng',
  });

  // Database Settings
  const [databaseSettings, setDatabaseSettings] = useState({
    backupEnabled: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    retentionDays: 30,
    autoArchiveResults: true,
    archiveAfterDays: 365,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // In production, load settings from API
      // const response = await configService.getAll();
      // setGeneralSettings(response.data.general);
      // etc...
    } catch (error) {
      showAlert('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // In production, save to API
      // await configService.updateBatch({
      //   general: generalSettings,
      //   exam: examSettings,
      //   security: securitySettings,
      //   notification: notificationSettings,
      //   email: emailSettings,
      //   database: databaseSettings,
      // });

      // Mock delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      showAlert('success', 'Settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      showAlert('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);

      // Reset to default values
      switch (resetSection) {
        case 'general':
          setGeneralSettings({
            ...generalSettings,
            defaultDuration: 60,
            defaultPassingScore: 50,
          });
          break;
        case 'exam':
          setExamSettings({
            defaultDuration: 60,
            defaultPassingScore: 50,
            allowLateSubmission: false,
            lateSubmissionPenalty: 10,
            autoGrading: true,
            showResultsImmediately: false,
            allowExamReview: true,
            shuffleQuestions: true,
            shuffleOptions: true,
            preventTabSwitch: true,
            maxTabSwitches: 3,
            enableProctoring: false,
          });
          break;
        case 'security':
          setSecuritySettings({
            sessionTimeout: 30,
            passwordMinLength: 8,
            passwordRequireUppercase: true,
            passwordRequireLowercase: true,
            passwordRequireNumbers: true,
            passwordRequireSpecial: true,
            passwordExpiryDays: 90,
            maxLoginAttempts: 5,
            lockoutDuration: 15,
            twoFactorAuth: false,
            ipWhitelist: '',
          });
          break;
      }

      showAlert('success', `${resetSection} settings reset to default`);
      setIsResetDialogOpen(false);
      setResetSection('');
    } catch (error) {
      showAlert('error', 'Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const renderGeneral = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">School Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="School Name"
              value={generalSettings.schoolName}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, schoolName: e.target.value });
                setHasChanges(true);
              }}
              required
            />
            <Input
              label="School Code"
              value={generalSettings.schoolCode}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, schoolCode: e.target.value });
                setHasChanges(true);
              }}
              required
            />
          </div>

          <TextArea
            label="School Address"
            value={generalSettings.schoolAddress}
            onChange={(e) => {
              setGeneralSettings({ ...generalSettings, schoolAddress: e.target.value });
              setHasChanges(true);
            }}
            rows={2}
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              value={generalSettings.schoolPhone}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, schoolPhone: e.target.value });
                setHasChanges(true);
              }}
            />
            <Input
              label="Email Address"
              type="email"
              value={generalSettings.schoolEmail}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, schoolEmail: e.target.value });
                setHasChanges(true);
              }}
            />
            <Input
              label="Website"
              type="url"
              value={generalSettings.schoolWebsite}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, schoolWebsite: e.target.value });
                setHasChanges(true);
              }}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Academic Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Academic Year"
            value={generalSettings.academicYear}
            onChange={(e) => {
              setGeneralSettings({ ...generalSettings, academicYear: e.target.value });
              setHasChanges(true);
            }}
            placeholder="e.g., 2024/2025"
          />
          <Select
            label="Current Term"
            value={generalSettings.currentTerm}
            onChange={(e) => {
              setGeneralSettings({ ...generalSettings, currentTerm: e.target.value });
              setHasChanges(true);
            }}
            options={[
              { value: 'First Term', label: 'First Term' },
              { value: 'Second Term', label: 'Second Term' },
              { value: 'Third Term', label: 'Third Term' },
            ]}
          />
        </div>
      </div>
    </div>
  );

  const renderExamSettings = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Default Exam Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Default Duration (minutes)"
              type="number"
              value={examSettings.defaultDuration}
              onChange={(e) => {
                setExamSettings({ ...examSettings, defaultDuration: parseInt(e.target.value) });
                setHasChanges(true);
              }}
              min={10}
            />
            <Input
              label="Default Passing Score (%)"
              type="number"
              value={examSettings.defaultPassingScore}
              onChange={(e) => {
                setExamSettings({
                  ...examSettings,
                  defaultPassingScore: parseInt(e.target.value),
                });
                setHasChanges(true);
              }}
              min={0}
              max={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={examSettings.allowLateSubmission}
                onChange={(e) => {
                  setExamSettings({ ...examSettings, allowLateSubmission: e.target.checked });
                  setHasChanges(true);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Allow Late Submission</span>
            </label>

            {examSettings.allowLateSubmission && (
              <Input
                label="Late Submission Penalty (%)"
                type="number"
                value={examSettings.lateSubmissionPenalty}
                onChange={(e) => {
                  setExamSettings({
                    ...examSettings,
                    lateSubmissionPenalty: parseInt(e.target.value),
                  });
                  setHasChanges(true);
                }}
                min={0}
                max={100}
              />
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Exam Behavior</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={examSettings.autoGrading}
              onChange={(e) => {
                setExamSettings({ ...examSettings, autoGrading: e.target.checked });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Auto Grading</span>
              <p className="text-xs text-gray-500">Automatically grade exams upon submission</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={examSettings.showResultsImmediately}
              onChange={(e) => {
                setExamSettings({ ...examSettings, showResultsImmediately: e.target.checked });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Show Results Immediately</span>
              <p className="text-xs text-gray-500">Display results right after submission</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={examSettings.allowExamReview}
              onChange={(e) => {
                setExamSettings({ ...examSettings, allowExamReview: e.target.checked });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Allow Exam Review</span>
              <p className="text-xs text-gray-500">Let students review their answers after exam</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={examSettings.shuffleQuestions}
              onChange={(e) => {
                setExamSettings({ ...examSettings, shuffleQuestions: e.target.checked });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Shuffle Questions</span>
              <p className="text-xs text-gray-500">Randomize question order for each student</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={examSettings.shuffleOptions}
              onChange={(e) => {
                setExamSettings({ ...examSettings, shuffleOptions: e.target.checked });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Shuffle Options</span>
              <p className="text-xs text-gray-500">Randomize answer options</p>
            </div>
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Proctoring & Security</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={examSettings.preventTabSwitch}
              onChange={(e) => {
                setExamSettings({ ...examSettings, preventTabSwitch: e.target.checked });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Prevent Tab Switching</span>
              <p className="text-xs text-gray-500">Alert when student switches tabs/windows</p>
            </div>
          </label>

          {examSettings.preventTabSwitch && (
            <Input
              label="Maximum Tab Switches Allowed"
              type="number"
              value={examSettings.maxTabSwitches}
              onChange={(e) => {
                setExamSettings({ ...examSettings, maxTabSwitches: parseInt(e.target.value) });
                setHasChanges(true);
              }}
              min={0}
            />
          )}

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={examSettings.enableProctoring}
              onChange={(e) => {
                setExamSettings({ ...examSettings, enableProctoring: e.target.checked });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Enable Proctoring</span>
              <p className="text-xs text-gray-500">Require webcam monitoring during exams</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            setResetSection('exam');
            setIsResetDialogOpen(true);
          }}
        >
          Reset to Default
        </Button>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Session Management</h3>
        <Input
          label="Session Timeout (minutes)"
          type="number"
          value={securitySettings.sessionTimeout}
          onChange={(e) => {
            setSecuritySettings({
              ...securitySettings,
              sessionTimeout: parseInt(e.target.value),
            });
            setHasChanges(true);
          }}
          min={5}
          helpText="Users will be automatically logged out after this period of inactivity"
        />
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Password Policy</h3>
        <div className="space-y-4">
          <Input
            label="Minimum Password Length"
            type="number"
            value={securitySettings.passwordMinLength}
            onChange={(e) => {
              setSecuritySettings({
                ...securitySettings,
                passwordMinLength: parseInt(e.target.value),
              });
              setHasChanges(true);
            }}
            min={6}
            max={32}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={securitySettings.passwordRequireUppercase}
                onChange={(e) => {
                  setSecuritySettings({
                    ...securitySettings,
                    passwordRequireUppercase: e.target.checked,
                  });
                  setHasChanges(true);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Require uppercase letters</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={securitySettings.passwordRequireLowercase}
                onChange={(e) => {
                  setSecuritySettings({
                    ...securitySettings,
                    passwordRequireLowercase: e.target.checked,
                  });
                  setHasChanges(true);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Require lowercase letters</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={securitySettings.passwordRequireNumbers}
                onChange={(e) => {
                  setSecuritySettings({
                    ...securitySettings,
                    passwordRequireNumbers: e.target.checked,
                  });
                  setHasChanges(true);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Require numbers</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={securitySettings.passwordRequireSpecial}
                onChange={(e) => {
                  setSecuritySettings({
                    ...securitySettings,
                    passwordRequireSpecial: e.target.checked,
                  });
                  setHasChanges(true);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Require special characters</span>
            </label>
          </div>

          <Input
            label="Password Expiry (days)"
            type="number"
            value={securitySettings.passwordExpiryDays}
            onChange={(e) => {
              setSecuritySettings({
                ...securitySettings,
                passwordExpiryDays: parseInt(e.target.value),
              });
              setHasChanges(true);
            }}
            min={0}
            helpText="Set to 0 to disable password expiry"
          />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Login Security</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Login Attempts"
              type="number"
              value={securitySettings.maxLoginAttempts}
              onChange={(e) => {
                setSecuritySettings({
                  ...securitySettings,
                  maxLoginAttempts: parseInt(e.target.value),
                });
                setHasChanges(true);
              }}
              min={1}
            />
            <Input
              label="Lockout Duration (minutes)"
              type="number"
              value={securitySettings.lockoutDuration}
              onChange={(e) => {
                setSecuritySettings({
                  ...securitySettings,
                  lockoutDuration: parseInt(e.target.value),
                });
                setHasChanges(true);
              }}
              min={1}
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={securitySettings.twoFactorAuth}
              onChange={(e) => {
                setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Enable Two-Factor Authentication
              </span>
              <p className="text-xs text-gray-500">Require 2FA for admin accounts</p>
            </div>
          </label>

          <TextArea
            label="IP Whitelist (Optional)"
            value={securitySettings.ipWhitelist}
            onChange={(e) => {
              setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value });
              setHasChanges(true);
            }}
            placeholder="Enter IP addresses, one per line"
            rows={3}
            helpText="Leave empty to allow access from any IP"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            setResetSection('security');
            setIsResetDialogOpen(true);
          }}
        >
          Reset to Default
        </Button>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Notification Channels</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.emailNotifications}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  emailNotifications: e.target.checked,
                });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Email Notifications</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.smsNotifications}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  smsNotifications: e.target.checked,
                });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">SMS Notifications</span>
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Student Notifications</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.examPublishedNotification}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  examPublishedNotification: e.target.checked,
                });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Exam Published</span>
              <p className="text-xs text-gray-500">Notify when new exam is available</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.resultPublishedNotification}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  resultPublishedNotification: e.target.checked,
                });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Result Published</span>
              <p className="text-xs text-gray-500">Notify when exam result is ready</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.examReminderNotification}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  examReminderNotification: e.target.checked,
                });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Exam Reminder</span>
              <p className="text-xs text-gray-500">Send reminder before exam starts</p>
            </div>
          </label>

          {notificationSettings.examReminderNotification && (
            <Input
              label="Send Reminder (hours before exam)"
              type="number"
              value={notificationSettings.reminderBeforeExam}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  reminderBeforeExam: parseInt(e.target.value),
                });
                setHasChanges(true);
              }}
              min={1}
            />
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Admin Notifications</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.alertAdminOnSuspiciousActivity}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  alertAdminOnSuspiciousActivity: e.target.checked,
                });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Suspicious Activity Alert</span>
              <p className="text-xs text-gray-500">Alert admin on unusual student behavior</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.alertTeacherOnExamStart}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  alertTeacherOnExamStart: e.target.checked,
                });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Exam Started Alert</span>
              <p className="text-xs text-gray-500">Notify teachers when exam begins</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderDatabase = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Backup Configuration</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={databaseSettings.backupEnabled}
              onChange={(e) => {
                setDatabaseSettings({ ...databaseSettings, backupEnabled: e.target.checked });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Enable Automatic Backups</span>
          </label>

          {databaseSettings.backupEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Backup Frequency"
                  value={databaseSettings.backupFrequency}
                  onChange={(e) => {
                    setDatabaseSettings({
                      ...databaseSettings,
                      backupFrequency: e.target.value,
                    });
                    setHasChanges(true);
                  }}
                  options={[
                    { value: 'hourly', label: 'Every Hour' },
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                />

                <Input
                  label="Backup Time"
                  type="time"
                  value={databaseSettings.backupTime}
                  onChange={(e) => {
                    setDatabaseSettings({ ...databaseSettings, backupTime: e.target.value });
                    setHasChanges(true);
                  }}
                />
              </div>

              <Input
                label="Backup Retention (days)"
                type="number"
                value={databaseSettings.retentionDays}
                onChange={(e) => {
                  setDatabaseSettings({
                    ...databaseSettings,
                    retentionDays: parseInt(e.target.value),
                  });
                  setHasChanges(true);
                }}
                min={1}
                helpText="Backups older than this will be automatically deleted"
              />
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Data Archiving</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={databaseSettings.autoArchiveResults}
              onChange={(e) => {
                setDatabaseSettings({
                  ...databaseSettings,
                  autoArchiveResults: e.target.checked,
                });
                setHasChanges(true);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Auto-Archive Old Results</span>
              <p className="text-xs text-gray-500">Move old exam results to archive</p>
            </div>
          </label>

          {databaseSettings.autoArchiveResults && (
            <Input
              label="Archive After (days)"
              type="number"
              value={databaseSettings.archiveAfterDays}
              onChange={(e) => {
                setDatabaseSettings({
                  ...databaseSettings,
                  archiveAfterDays: parseInt(e.target.value),
                });
                setHasChanges(true);
              }}
              min={30}
              helpText="Results older than this will be archived"
            />
          )}
        </div>
      </div>

      <div className="card bg-yellow-50">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div>
            <h4 className="font-medium text-yellow-900">Database Maintenance</h4>
            <p className="mt-1 text-sm text-yellow-800">
              Regular backups are essential for data safety. Make sure your backup location has
              sufficient storage space.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm">
                Backup Now
              </Button>
              <Button variant="secondary" size="sm">
                View Backups
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <Loader fullScreen text="Loading settings..." />;
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
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-1 text-sm text-gray-600">Configure system-wide settings</p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} loading={saving}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex gap-2 overflow-x-auto border-b border-gray-200">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'exam', label: 'Exam Settings', icon: FileText },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'database', label: 'Database', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && renderGeneral()}
      {activeTab === 'exam' && renderExamSettings()}
      {activeTab === 'security' && renderSecurity()}
      {activeTab === 'notifications' && renderNotifications()}
      {activeTab === 'database' && renderDatabase()}

      {/* Fixed Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-10">
          <Button onClick={handleSave} loading={saving} className="shadow-lg">
            <Save className="mr-2 h-4 w-4" />
            Save All Changes
          </Button>
        </div>
      )}

      {/* Reset Confirmation */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleReset}
        title="Reset Settings"
        message={`Are you sure you want to reset ${resetSection} settings to default values? This action cannot be undone.`}
        confirmText="Reset"
        type="danger"
        loading={saving}
      />
    </div>
  );
};

export default SystemSettings;