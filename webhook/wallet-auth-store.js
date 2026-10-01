const challenges = new Map();
const TIMEOUT_MS = 300 * 1000; // 5 minutes

function generateChallengeId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

exports.rememberChallenge = function rememberChallenge(account, transactionXdr) {
  const challengeId = generateChallengeId();
  const entry = {
    id: challengeId,
    account,
    transactionXdr,
    createdAt: Date.now(),
    used: false
  };
  challenges.set(challengeId, entry);
  
  // Cleanup after timeout
  setTimeout(() => {
    challenges.delete(challengeId);
  }, TIMEOUT_MS);
  
  return challengeId;
};

exports.consumeChallenge = function consumeChallenge(challengeId, transactionXdr) {
  const entry = challenges.get(challengeId);
  
  if (!entry) {
    return null;
  }
  
  if (entry.used) {
    return null;
  }
  
  if (entry.transactionXdr !== transactionXdr) {
    return null;
  }
  
  if (Date.now() - entry.createdAt > TIMEOUT_MS) {
    challenges.delete(challengeId);
    return null;
  }
  
  entry.used = true;
  return entry;
};
