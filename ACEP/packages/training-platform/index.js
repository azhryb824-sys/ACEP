const db = require('./database');
const imageRecords = require('./image-record');
const qa = require('./quality-assessment');
const dups = require('./duplicate-detection');
const splitter = require('./dataset-splitter');
const balancer = require('./dataset-balancer');
const statsDash = require('./stats-dashboard');
const AutoClassifier = require('./auto-classifier');
const versions = require('./version-manager');
const cert = require('./certification');
const readiness = require('./readiness-report');
const background = require('./background-processor');
const { EXPORTERS } = require('./exporters');
const integration = require('./integration');
const { registerTrainingPlatformRoutes } = require('./routes');

module.exports = {
  TrainingDatabase: db,
  ImageRecordManager: imageRecords,
  QualityAssessmentSystem: qa,
  DuplicateDetectionSystem: dups,
  DatasetSplitter: splitter,
  DatasetBalancer: balancer,
  StatsDashboard: statsDash,
  AutoClassifier,
  VersionManager: versions,
  CertificationSystem: cert,
  ReadinessReport: readiness,
  BackgroundProcessor: background,
  EXPORTERS,
  TrainingPlatformIntegration: integration,
  registerTrainingPlatformRoutes,
};
