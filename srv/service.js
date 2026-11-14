const cds = require('@sap/cds')

module.exports = cds.service.impl(function () {

    const { Contracts, ContractItems } = this.entities

    /* ======================================================
       DRAFT CONTRACT TOTAL BEFORE SAVE
       Calculates every item value and sums all line items
       before the complete contract draft is activated
       ====================================================== */

    this.before('SAVE', Contracts.drafts, async (req) => {

      const contractID = req.data.ID

        if (!contractID) {
            return
        }

        const tx = cds.tx(req)

        /*
         * Read all items belonging to the current draft
         * contract. This supports one or multiple line items.
         */

        const draftItems = await tx.run(
            SELECT
                .from(ContractItems.drafts)
                .columns(
                    'ID',
                    'quantity',
                    'unitPrice'
                )
                .where({
                    parent_ID: contractID
                })
        )

        let headerTotalValue = 0

        /*
         * Calculate every draft item value separately.
         */

        for (const item of draftItems) {

            const quantity =
                Number(item.quantity || 0)

            const unitPrice =
                Number(item.unitPrice || 0)

            const itemValue =
                Math.round(
                    quantity * unitPrice * 100
                ) / 100

            headerTotalValue += itemValue

            await tx.run(
                UPDATE(ContractItems.drafts)
                    .set({
                        value: itemValue
                    })
                    .where({
                        ID: item.ID
                    })
            )
        }

        /*
         * Round the sum of all line-item values.
         */

        headerTotalValue =
            Math.round(headerTotalValue * 100) / 100

        /*
         * Update the draft header before activation.
         */

        await tx.run(
            UPDATE(Contracts.drafts)
                .set({
                    totalValue: headerTotalValue
                })
                .where({
                    ID: contractID
                })
        )

        /*
         * Also include the value in the current SAVE request.
         */

        req.data.totalValue =
            headerTotalValue

        console.log(
            `[DRAFT TOTAL] Contract ${contractID}, items: ${draftItems.length}, total: ${headerTotalValue}`
        )
    })

    /* ======================================================
       HELPER: DAYS REMAINING AND RISK LEVEL
       ====================================================== */

    const calculateRisk = (endDate) => {

        if (!endDate) {
            return {
                daysRemaining: null,
                riskLevel: 'Not Assessed'
            }
        }

        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)

        const contractEndDate = new Date(`${endDate}T00:00:00Z`)

        const daysRemaining = Math.ceil(
            (contractEndDate - today) / (1000 * 60 * 60 * 24)
        )

        let riskLevel

        if (daysRemaining <= 30) {
            riskLevel = 'Critical'
        } else if (daysRemaining <= 60) {
            riskLevel = 'High'
        } else if (daysRemaining <= 90) {
            riskLevel = 'Medium'
        } else {
            riskLevel = 'Low'
        }

        return {
            daysRemaining,
            riskLevel
        }
    }

    /* ======================================================
       HELPER: AI ASSESSMENT, RISK ANALYSIS & RECOMMENDATION
       Rule-based content used before Azure OpenAI integration
       ====================================================== */

    const buildContractAssessment = (contract, itemCount = 0) => {

        const {
            contractNo,
            supplierNo,
            supplierName,
            contractType,
            startDate,
            endDate,
            currency,
            totalValue
        } = contract

        const { daysRemaining, riskLevel } = calculateRisk(endDate)

        const supplier = supplierName && supplierNo
            ? `${supplierName} (${supplierNo})`
            : supplierName || supplierNo || 'Not maintained'

        const formattedValue = Number(totalValue || 0).toLocaleString(
            'en-US',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )

        const contractTypeText = contractType === 'MK'
            ? 'Quantity Contract (MK)'
            : contractType === 'WK'
                ? 'Value Contract (WK)'
                : contractType || 'Not maintained'

        const aiSummary = [
            `Contract ${contractNo || ''} is maintained with supplier ${supplier}.`,
            `The agreement is a ${contractTypeText} with ${itemCount} contract item${itemCount === 1 ? '' : 's'}.`,
            `The current contract value is ${currency || ''} ${formattedValue}.`,
            startDate && endDate
                ? `The validity period is from ${startDate} to ${endDate}.`
                : 'The complete validity period is not maintained.'
        ].join(' ')

        let riskAnalysis
        let recommendation

        if (daysRemaining === null) {
            riskAnalysis =
                'The contract risk cannot be assessed because the end date is not maintained.'

            recommendation =
                'Maintain the contract end date and review the contract validity.'

        } else if (daysRemaining < 0) {
            riskAnalysis =
                `The contract expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago and is classified as Critical.`

            recommendation =
                'Review the expired contract immediately. Confirm whether procurement activity must stop, the contract must be renewed, or a replacement contract must be created.'

        } else if (riskLevel === 'Critical') {
            riskAnalysis =
                `The contract expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} and is classified as Critical. Immediate attention is required to avoid contract expiry or supply interruption.`

            recommendation =
                'Initiate supplier renewal discussions immediately. Review demand, quantities, pricing conditions, and approval requirements before extending or replacing the contract.'

        } else if (riskLevel === 'High') {
            riskAnalysis =
                `The contract expires in ${daysRemaining} days and is classified as High risk. Renewal preparation should begin soon.`

            recommendation =
                'Schedule a supplier review, validate future demand, compare current pricing, and prepare the renewal or replacement strategy.'

        } else if (riskLevel === 'Medium') {
            riskAnalysis =
                `The contract expires in ${daysRemaining} days and is classified as Medium risk. The contract should remain under active monitoring.`

            recommendation =
                'Review the contract scope and consumption, confirm the business requirement, and plan the renewal decision before the high-risk period begins.'

        } else {
            riskAnalysis =
                `The contract expires in ${daysRemaining} days and is currently classified as Low risk. No immediate expiry action is required.`

            recommendation =
                'Continue periodic monitoring and review supplier performance, contract consumption, and commercial conditions during the next scheduled assessment.'
        }
            let riskCriticality = 3

            if (riskLevel === 'Critical') {
                riskCriticality = 1
            }
            else if (
                riskLevel === 'High' ||
                riskLevel === 'Medium'
            ) {
                riskCriticality = 2
            }
            else {
                riskCriticality = 3
            }

            return {
                riskLevel,
                riskCriticality,
                aiSummary,
                riskAnalysis,
                recommendation
            }
    }

    /* ======================================================
       CONTRACT RISK & AI ASSESSMENT CALCULATION
       ====================================================== */
    this.before(['CREATE', 'UPDATE'], Contracts, async (req) => {
        let contractData = { ...req.data }
        if (req.event === 'UPDATE' && req.data.ID) {
            const existingContract = await SELECT.one
                .from(Contracts)
                .where({ ID: req.data.ID })
            contractData = {
                ...existingContract,
                ...req.data
            }
        }
        const { startDate, endDate } = contractData

        if (startDate && endDate) {
            const start = new Date(`${startDate}T00:00:00Z`)
            const end = new Date(`${endDate}T00:00:00Z`)

            if (end < start) {
                req.error(
                    400,
                    'Contract End Date cannot be earlier than Start Date.'
                )
                return
            }
        }

        const itemCount = req.data.ID
            ? await SELECT.from(ContractItems)
                .columns('ID')
                .where({ parent_ID: req.data.ID })
                .then(items => items.length)
            : Array.isArray(req.data.items)
                ? req.data.items.length
                : 0

        const assessment = buildContractAssessment(
            contractData,
            itemCount
        )

        req.data.riskLevel = assessment.riskLevel
        req.data.riskCriticality = assessment.riskCriticality
         req.data.aiSummary = assessment.aiSummary
        req.data.riskAnalysis = assessment.riskAnalysis
        req.data.recommendation = assessment.recommendation
    })

    /* ======================================================
       ITEM VALUE = QUANTITY x UNIT PRICE
       ====================================================== */

    this.before(['CREATE', 'UPDATE'], ContractItems, async (req) => {

        let quantity = req.data.quantity
        let unitPrice = req.data.unitPrice

        if (req.event === 'UPDATE' && req.data.ID) {
            const existingItem = await SELECT.one
                .from(ContractItems)
                .where({ ID: req.data.ID })

            quantity = quantity !== undefined
                ? quantity
                : existingItem?.quantity

            unitPrice = unitPrice !== undefined
                ? unitPrice
                : existingItem?.unitPrice
        }

        req.data.value =
            Number(quantity || 0) * Number(unitPrice || 0)
    })

    /* ======================================================
       HEADER TOTAL VALUE
       ====================================================== */

    const recalculateContractTotal = async (parentID) => {

        if (!parentID) return

        const items = await SELECT
            .from(ContractItems)
            .columns('value')
            .where({ parent_ID: parentID })

        const totalValue = items.reduce(
            (sum, row) => sum + Number(row.value || 0),
       )

        await UPDATE(Contracts)
            .set({ totalValue })
            .where({ ID: parentID })
    }

    /* ======================================================
       CONTRACT TOTAL RECONCILIATION AFTER SAVE
       Handles new draft-enabled contracts and compositions
       Updates item values and header total after activation
       ====================================================== */

    this.after(['CREATE', 'UPDATE'], Contracts, async (data) => {

        if (!data || !data.ID) {
            return
        }

        /*
         * Read all active persisted items belonging
         * to the saved contract.
         */

        const savedItems = await SELECT
            .from('contract.ai.ContractItems')
            .columns(
                'ID',
                'quantity',
                'unitPrice'
            )
            .where({
                parent_ID: data.ID
            })

        console.log(
            `[TOTAL RECONCILIATION] Contract ${data.ID}, items found: ${savedItems.length}`
        )

        let calculatedTotal = 0

        /*
         * Calculate and persist the value of every item.
         */

        for (const item of savedItems) {

            const quantity =
                Number(item.quantity || 0)

            const unitPrice =
                Number(item.unitPrice || 0)

            const itemValue =
                Math.round(
                    quantity * unitPrice * 100
                ) / 100

            calculatedTotal += itemValue

            await UPDATE('contract.ai.ContractItems')
                .set({
                    value: itemValue
                })
                .where({
                    ID: item.ID
                })

            console.log(
                `[ITEM VALUE] Item ${item.ID}: ${quantity} x ${unitPrice} = ${itemValue}`
            )
        }

        const roundedTotal =
            Math.round(calculatedTotal * 100) / 100

        /*
         * Persist the calculated header total.
         */

        await UPDATE('contract.ai.Contracts')
            .set({
                totalValue: roundedTotal
            })
            .where({
                ID: data.ID
            })

        /*
         * Also return the calculated value in the
         * draft activation response where possible.
         */

        data.totalValue = roundedTotal

        console.log(
            `[TOTAL RECONCILIATION] Calculated total: ${roundedTotal}`
        )
    })
    
    /* ======================================================
       CREATE ITEM
       ====================================================== */

    this.after('CREATE', ContractItems, async (data) => {
        await recalculateContractTotal(data.parent_ID)
    })

    /* ======================================================
       UPDATE ITEM
       ====================================================== */

    this.after('UPDATE', ContractItems, async (data) => {

        const item = await SELECT.one
            .from(ContractItems)
            .columns('parent_ID')
            .where({ ID: data.ID })

        if (item) {
            await recalculateContractTotal(item.parent_ID)
        }
    })

    /* ======================================================
       DELETE ITEM
       ====================================================== */

    this.before('DELETE', ContractItems, async (req) => {

        const existing = await SELECT.one
            .from(ContractItems)
            .columns('parent_ID')
            .where({ ID: req.data.ID })

        req._parentID = existing?.parent_ID
    })

    this.after('DELETE', ContractItems, async (_, req) => {
        await recalculateContractTotal(req._parentID)
    })

    /* ======================================================
       CALCULATE HEADER TOTAL & ASSESSMENT WHEN CONTRACT IS READ
       Retrieves the complete contract before assessment
       ====================================================== */

    this.after('READ', Contracts, async (contracts) => {

        const contractList = Array.isArray(contracts)
            ? contracts
            : [contracts]

        for (const contract of contractList) {

            if (!contract || !contract.ID) {
                continue
            }

            /*
             * Fiori may request only selected fields.
             * Read the complete database record so that
             * endDate, contractType, supplier and currency
             * are always available for assessment.
             */

            const completeContract = await SELECT.one
              .from('contract.ai.Contracts')
              .where({ ID: contract.ID })

            if (!completeContract) {
                continue
            }

            const items = await SELECT
               .from('contract.ai.ContractItems')
               .columns('quantity', 'unitPrice')
                .where({ parent_ID: contract.ID })

            const totalValue = items.reduce(
              (total, item) => {

                   const quantity =
                       Number(item.quantity || 0)

                    const unitPrice =
                       Number(item.unitPrice || 0)
                    return total +(quantity * unitPrice)
              },
             0                
           )

            const calculatedTotal =
                Math.round(Number(totalValue) * 100) / 100

           const assessment = buildContractAssessment(
                {                    ...completeContract,
                    totalValue: calculatedTotal
               },
                items.length
           )

            contract.totalValue =
                calculatedTotal

            contract.riskLevel =
                assessment.riskLevel

            contract.riskCriticality =
               assessment.riskCriticality

                /*
                * Preserve Azure OpenAI content when it exists.
                * Use the rule-based assessment only as fallback.
                */

                contract.aiSummary =
                    completeContract.aiSummary ||
                    assessment.aiSummary

                contract.riskAnalysis =
                    completeContract.riskAnalysis ||
                    assessment.riskAnalysis

                contract.recommendation =
                    completeContract.recommendation ||
                    assessment.recommendation
   }
    })
    /* ======================================================
       CALCULATE ANALYTICS VALUES WHEN DASHBOARD DATA IS READ
       Keeps ContractAnalytics total aligned with contract items
       Risk Level is taken from the stored contract record
       ====================================================== */

    this.after('READ', 'ContractAnalytics', async (contracts) => {

        const contractList = Array.isArray(contracts)
            ? contracts
            : [contracts]

        for (const contract of contractList) {

            /*
             * Aggregated dashboard rows may not contain an ID.
             * In that case, keep the aggregated database result.
             */
            if (!contract || !contract.ID) {
                continue
            }

              /* ==================================================
               EXPIRY ALERT CALCULATION
               ================================================== */

            if (contract.endDate) {

                const today = new Date()
                today.setUTCHours(0, 0, 0, 0)

                const contractEndDate =
                    new Date(`${contract.endDate}T00:00:00Z`)

                const millisecondsPerDay =
                    1000 * 60 * 60 * 24

                const daysRemaining = Math.ceil(
                    (contractEndDate - today)
                    / millisecondsPerDay
                )

                contract.daysRemaining = daysRemaining
                /* ==============================================
                   LIVE DASHBOARD RISK CALCULATION
                   Uses the same expiry rules as the Contract app
                   ============================================== */

                const liveRisk =
                    calculateRisk(contract.endDate)

                contract.riskLevel =
                    liveRisk.riskLevel

                if (daysRemaining < 0) {

                    contract.expiryStatus = 'Expired'

                } else if (daysRemaining <= 30) {

                    contract.expiryStatus =
                        'Expires within 30 days'

                } else if (daysRemaining <= 60) {

                    contract.expiryStatus =
                        'Expires within 60 days'

                } else if (daysRemaining <= 90) {

                    contract.expiryStatus =
                        'Expires within 90 days'

                } else {

                    contract.expiryStatus =
                        'Active beyond 90 days'
                }

            } else {

                contract.daysRemaining = null
                contract.expiryStatus = 'End date not maintained'
            }

            /* ==================================================
               AI ALERT CALCULATION
               Uses stored Azure recommendation when available.
               Falls back to rule-based alert when AI analysis
               has not yet been executed.
               ================================================== */

            const completeAnalyticsContract =
                await SELECT.one
                    .from('contract.ai.Contracts')
                    .columns(
                        'aiStatus',
                        'aiAnalyzedAt',
                        'recommendation'
                    )
                    .where({
                        ID: contract.ID
                    })

            /*
             * Bring stored AI traceability into
             * ContractAnalytics response.
             */

            if (completeAnalyticsContract) {

                contract.aiStatus =
                    completeAnalyticsContract.aiStatus

                contract.aiAnalyzedAt =
                    completeAnalyticsContract.aiAnalyzedAt
            }

            /*
             * If Azure OpenAI analysis exists,
             * use the stored Azure recommendation.
             */

            if (
                completeAnalyticsContract?.aiStatus === 'Analyzed' &&
                completeAnalyticsContract?.recommendation
            ) {

                const azureRecommendation =
                    String(
                        completeAnalyticsContract.recommendation
                    ).trim()

                /*
                 * Keep the Dashboard alert concise.
                 * The complete recommendation remains available
                 * in the Contract Object Page.
                 */

                contract.aiAlert =
                    azureRecommendation.length > 120
                        ? `${azureRecommendation.substring(0, 117)}...`
                        : azureRecommendation

            } else if (
                contract.expiryStatus === 'Expired'
            ) {

                contract.aiAlert =
                    'AI analysis pending. Contract has expired and requires immediate review.'

            } else if (
                contract.riskLevel === 'Critical'
            ) {

                contract.aiAlert =
                    'AI analysis pending. Immediate renewal action required.'

            } else if (
                contract.riskLevel === 'High'
            ) {

                contract.aiAlert =
                    'AI analysis pending. Start supplier renewal preparation.'

            } else if (
                contract.riskLevel === 'Medium'
            ) {

                contract.aiAlert =
                    'AI analysis pending. Monitor validity and prepare renewal strategy.'

            } else if (
                contract.riskLevel === 'Low'
            ) {

                contract.aiAlert =
                    'AI analysis pending. No immediate action required.'

            } else {

                contract.aiAlert =
                    'AI analysis pending.'
            }

                const items = await SELECT
                    .from('contract.ai.ContractItems')
                    .columns('quantity', 'unitPrice')
                    .where({ parent_ID: contract.ID })

                            const calculatedTotalValue = items.reduce(
                (total, item) => {

                    const quantity =
                        Number(item.quantity || 0)

                    const unitPrice =
                        Number(item.unitPrice || 0)

                    return total + (quantity * unitPrice)
                },
              0
            )

            contract.totalValue =
                Math.round(
                    Number(calculatedTotalValue) * 100
                ) / 100
        }
    })

        /* ======================================================
       AZURE OPENAI CONTRACT ANALYSIS
       Reads the saved contract and all line items,
       calls Azure OpenAI, and updates the AI sections
       ====================================================== */

    this.on('runAIAnalysis', Contracts, async (req) => {

        const contractID  =
            req.params?.[0]?.ID

        if (!contractID) {
            return req.reject(
                400,
                'Contract ID is required to run AI analysis.'
            )
        }

        /* ==================================================
           READ AZURE OPENAI CONFIGURATION
           ================================================== */

        const azureEndpoint =
            process.env.AZURE_OPENAI_ENDPOINT

        const azureApiKey =
            process.env.AZURE_OPENAI_API_KEY

        const azureDeployment =
            process.env.AZURE_OPENAI_DEPLOYMENT

        if (
            !azureEndpoint ||
            !azureApiKey ||
            !azureDeployment
        ) {
            return req.reject(
                500,
                'Azure OpenAI configuration is incomplete. Check the .env file.'
            )
        }

        /* ==================================================
           READ COMPLETE ACTIVE CONTRACT
           ================================================== */

        const contract = await SELECT.one
            .from('contract.ai.Contracts')
            .where({
                ID: contractID
            })

        if (!contract) {
            return req.reject(
                404,
                `Contract ${contractID} was not found.`
            )
        }

        /* ==================================================
           READ ALL ACTIVE CONTRACT ITEMS
           ================================================== */

        const items = await SELECT
            .from('contract.ai.ContractItems')
            .columns(
                'itemNo',
                'material',
                'shortText',
                'description',
                'quantity',
                'orderUnit',
                'unitPrice',
                'value',
                'plant'
            )
            .where({
                parent_ID: contractID
            })
            .orderBy('itemNo')

        /* ==================================================
           PREPARE CONTRACT DATA FOR AZURE OPENAI
           ================================================== */

        const contractPayload = {
            contractNumber: contract.contractNo,

            supplier: {
                supplierNumber: contract.supplierNo,
                supplierName: contract.supplierName
            },

            contractType: contract.contractType,

            validity: {
                startDate: contract.startDate,
                endDate: contract.endDate
            },

            commercialInformation: {
                currency: contract.currency,
                totalValue: Number(
                    contract.totalValue || 0
                )
            },

            currentSystemRiskLevel:
                contract.riskLevel,

            items: items.map(item => ({
                itemNumber: item.itemNo,
                material: item.material,
                shortText: item.shortText,
                description: item.description,
                quantity: Number(
                    item.quantity || 0
                ),
                orderUnit: item.orderUnit,
                unitPrice: Number(
                    item.unitPrice || 0
                ),
                itemValue: Number(
                    item.value || 0
                ),
                plant: item.plant
            }))
        }

        /* ==================================================
           AZURE OPENAI PROMPT
           ================================================== */

        const systemPrompt = `
You are an enterprise procurement contract analyst.

Analyze the supplied SAP purchasing contract data from a procurement
and commercial-risk perspective.

Return only one valid JSON object using exactly this structure:

{
  "aiSummary": "A concise business summary of the complete contract.",
  "riskAnalysis": "The key commercial, expiry, supplier, quantity, value and continuity risks.",
  "recommendation": "Clear procurement actions recommended for the buyer."
}

Requirements:

1. Use only the contract information provided.
2. Do not invent legal clauses or contractual conditions.
3. Clearly state when clause information is unavailable.
4. Mention the supplier, contract type, validity, total value and item count.
5. Consider expiry timing and the current system risk level.
6. Keep every section concise, professional and suitable for procurement management.
7. Do not return Markdown.
8. Do not return code fences.
9. Do not return any text before or after the JSON object.
`

        const userPrompt = `
Analyze this SAP purchasing contract:

${JSON.stringify(contractPayload, null, 2)}
`

        /* ==================================================
           BUILD AZURE OPENAI V1 URL
           ================================================== */

        const normalizedEndpoint =
            azureEndpoint.replace(/\/+$/, '')

        const azureUrl =
            `${normalizedEndpoint}/openai/v1/chat/completions`

        console.log(
            `[AZURE OPENAI] Starting analysis for contract ${contract.contractNo}`
        )

        try {

            /* ==============================================
               CALL AZURE OPENAI
               ============================================== */

            const response = await fetch(
                azureUrl,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': azureApiKey
                    },

                    body: JSON.stringify({
                        model: azureDeployment,

                        messages: [
                            {
                                role: 'system',
                                content: systemPrompt
                            },
                            {
                                role: 'user',
                                content: userPrompt
                            }
                        ],

                        response_format: {
                            type: 'json_object'
                        }
                    })
                }
            )

            /* ==============================================
               HANDLE AZURE HTTP ERROR
               ============================================== */

            if (!response.ok) {

                const errorText =
                    await response.text()

                console.error(
                    `[AZURE OPENAI] HTTP ${response.status}: ${errorText}`
                )

                return req.reject(
                    502,
                    `Azure OpenAI request failed with HTTP status ${response.status}.`
                )
            }

            const azureResult =
                await response.json()

            /* ==============================================
               EXTRACT AI RESPONSE
               ============================================== */

            const aiContent =
                azureResult?.choices?.[0]
                    ?.message?.content

            if (!aiContent) {

                console.error(
                    '[AZURE OPENAI] No message content returned:',
                    JSON.stringify(azureResult)
                )

                return req.reject(
                    502,
                    'Azure OpenAI returned an empty analysis.'
                )
            }

            /* ==============================================
               PARSE AND VALIDATE JSON RESPONSE
               ============================================== */
            let aiAnalysis
            try {
                aiAnalysis =
                    JSON.parse(aiContent)
            } catch (parseError) {
                console.error(
                    '[AZURE OPENAI] Invalid JSON response:',
                    aiContent
                )
                return req.reject(
                    502,
                    'Azure OpenAI returned an invalid JSON response.'
                )
            }

             const aiSummary =
                String(
                    aiAnalysis.aiSummary || ''
                ).trim()

            const riskAnalysis =
                String(
                    aiAnalysis.riskAnalysis || ''
                ).trim()

            const recommendation =
                String(
                    aiAnalysis.recommendation || ''
                ).trim()

            if (
                !aiSummary ||
                !riskAnalysis ||
                !recommendation
            ) {
                return req.reject(
                    502,
                    'Azure OpenAI did not return all required analysis sections.'
                )
            }


            /* ==============================================
               UPDATE CONTRACT WITH AZURE OPENAI RESULTS
               ============================================== */

            console.log(
                '[AZURE OPENAI] Raw parsed result:',
                JSON.stringify({
                    aiSummary,
                    riskAnalysis,
                    recommendation
                })
            )

            const tx = cds.tx(req)

            const updatedRows = await tx.run(
                UPDATE('contract.ai.Contracts')
                        .set({
                            aiSummary,
                            riskAnalysis,
                            recommendation,
                            aiStatus: 'Analyzed',
                            aiAnalyzedAt: new Date().toISOString()
                        })
                    .where({
                        ID: contractID
                    })
            )

            console.log(
                `[AZURE OPENAI] Database rows updated: ${updatedRows}`
            )


            /* ==============================================
               VERIFY STORED AZURE OPENAI RESULT
               ============================================== */

            const storedAIResult = await tx.run(
                SELECT.one
                    .from('contract.ai.Contracts')
                    .columns(
                        'ID',
                        'contractNo',
                        'aiSummary',
                        'riskAnalysis',
                        'recommendation',
                            'aiStatus',
                            'aiAnalyzedAt'
                    )
                    .where({
                        ID: contractID
                    })
            )

            console.log(
                '[AZURE OPENAI] Stored database result:',
                JSON.stringify(storedAIResult)
            )

            console.log(
                `[AZURE OPENAI] Analysis completed for contract ${contract.contractNo}`
            )
                return await SELECT.one
                    .from(Contracts)
                    .where({
                        ID: contractID
                    })
                  } catch (error) {

            console.error(
                '[AZURE OPENAI] Unexpected error:',
                error
            )

            return req.reject(
                502,
                `Azure OpenAI connection failed: ${error.message}`
            )
        }
    })
})