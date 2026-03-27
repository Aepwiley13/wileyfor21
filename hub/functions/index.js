const { onContactLogCreated } = require("./onContactLogCreated");
const { staleDelegateAlert } = require("./staleDelegateAlert");
const { onSurveyCompleted } = require("./onSurveyCompleted");
const { staleDelegateSurveyAlert, clearSurveyFollowUpFlag } = require("./staleDelegateSurveyAlert");

module.exports = {
  onContactLogCreated,
  staleDelegateAlert,
  onSurveyCompleted,
  staleDelegateSurveyAlert,
  clearSurveyFollowUpFlag,
};
