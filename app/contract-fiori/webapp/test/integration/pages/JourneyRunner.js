sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"contractfiori/test/integration/pages/ContractsList.gen",
	"contractfiori/test/integration/pages/ContractsObjectPage.gen",
	"contractfiori/test/integration/pages/ContractItemsObjectPage.gen"
], function (JourneyRunner, ContractsListGenerated, ContractsObjectPageGenerated, ContractItemsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('contractfiori') + '/test/flp.html#app-preview',
        pages: {
			onTheContractsListGenerated: ContractsListGenerated,
			onTheContractsObjectPageGenerated: ContractsObjectPageGenerated,
			onTheContractItemsObjectPageGenerated: ContractItemsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

