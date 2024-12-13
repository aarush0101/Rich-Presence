function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function logError(message, error = null) {
  console.error(`[ERROR] ${message}`, error || "");
}

function logDebug(message, debug = null) {
  console.debug(`[DEBUG] ${message}`, debug || "");
}

function verifyStatus(status) {
  if (!status) return [false, null];

  const allowedStatuses = ["online", "idle", "dnd", "invisible", "offline"];
  if (!allowedStatuses.includes(status)) {
    logError(`Invalid status provided: ${status}`);
    const refined = status === "offline" ? "invisible" : null;
    return [false, refined];
  }

  return [true, status];
}

function validateEnvVariables() {
  const requiredVariables = ["BOT_TOKEN", "USER_TOKEN", "CHANNEL_ID", "START"];
  requiredVariables.forEach((variable) => {
    if (!process.env[variable]) {
      logError(`Missing required environment variable: ${variable}`);
      process.exit(1);
    }
  });

  if (isNaN(Number(process.env.TYPE))) {
    logError("Invalid TYPE in .env file. Must be a number.");
    process.exit(1);
  }
}

function isStartEnabled() {
  const startStates = ["true", "y", "continue", "y"];
  return startStates.includes(process.env.START?.toLowerCase() || "");
}

function isActivityDisabled() {
  const noActivityStates = ["true", "yes", "continue", "y"];
  return noActivityStates.includes(
    process.env.NO_ACTIVITY?.toLowerCase() || ""
  );
}

function isTrue(variable) {
  if (!variable) return false;
  const states = ["true", "yes", "continue", "y"];
  return states.includes(process.env[variable]?.toLowerCase() || "");
}

function isFalse(variable) {
  if (!variable) return false;
  const states = ["false", "no", "back", "n"];
  return states.includes(process.env[variable]?.toLowerCase() || "");
}

module.exports = {
  logInfo,
  logError,
  validateEnvVariables,
  isStartEnabled,
  isActivityDisabled,
  isFalse,
  isTrue,
  logDebug,
  verifyStatus,
};
