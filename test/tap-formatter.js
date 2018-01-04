const Formatter = require('cucumber/lib/formatter').default

class SummaryFormatter extends Formatter {
    constructor(options) {
      super(options)
      options.eventBroadcaster.on('test-run-finished', this.logSummary.bind(this))
    }

    logSummary(testRun) {
        let counter = 1
        
        const count = Object.keys(this.eventDataCollector.testCaseMap).length
        this.log(`TAP version 13\n`)
        this.log(`1..${count}\n`)
        for (const test in this.eventDataCollector.testCaseMap) {
            const testCase = this.eventDataCollector.testCaseMap[test]
                        
            const testCaseData = this.eventDataCollector.getTestCaseData(testCase.sourceLocation)

            const featureName = testCaseData.gherkinDocument.feature.name
            const scenarioName = testCaseData.pickle.name
            const result = testCase.result.status

            this.log(`${result === 'passed'? 'ok' : 'not ok'} ${counter} ${featureName} - ${scenarioName}\n`)

            counter++
        }
      }
}

exports.default = SummaryFormatter