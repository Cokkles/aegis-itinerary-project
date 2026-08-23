function testAegisAiQueryV1() {
  var result = handleAegisAiQueryV1_({
    mode: "system",
    question: "Summarize current AEGIS system health in three concise bullets.",
    history: []
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
