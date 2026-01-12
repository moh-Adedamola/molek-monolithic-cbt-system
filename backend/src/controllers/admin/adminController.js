/**
 * Main Admin Controller
 *
 * Central hub that imports and re-exports all admin-related controllers.
 * This maintains backwards compatibility with existing routes while
 * organizing code into logical, maintainable modules.
 */

const studentController = require('./studentController');
const examController = require('./examController');
const questionController = require('./questionController');
const resultController = require('./resultController');
const dashboardController = require('./dashboardController');
const monitoringController = require('./monitoringController');
const auditController = require('./auditController');

module.exports = {
    // Students
    ...studentController,

    // Exams
    ...examController,

    // Questions
    ...questionController,

    // Results
    ...resultController,

    // Dashboard
    ...dashboardController,

    // Monitoring
    ...monitoringController,

    // Audit Logs
    ...auditController
};