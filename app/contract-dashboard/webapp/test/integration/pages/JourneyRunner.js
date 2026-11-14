sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"contract/ai/dashboard/contractdashboard/test/integration/pages/ContractAnalyticsList.gen",
	"contract/ai/dashboard/contractdashboard/test/integration/pages/ContractAnalyticsObjectPage.gen"
], function (JourneyRunner, ContractAnalyticsListGenerated, ContractAnalyticsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('contract/ai/dashboard/contractdashboard') + '/test/flp.html#app-preview',
        pages: {
			onTheContractAnalyticsListGenerated: ContractAnalyticsListGenerated,
			onTheContractAnalyticsObjectPageGenerated: ContractAnalyticsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

