using { contract.ai as db } from '../db/schema';

service ContractService {

@odata.draft.enabled
entity Contracts as projection on db.Contracts {
    *,
   virtual riskCriticality : Integer
}
actions {action runAIAnalysis()
      returns Contracts;
};

    @readonly
    @cds.redirection.target: false
    entity ContractAnalytics as projection on db.Contracts {
    key ID,
    contractNo,
    supplierNo,
    supplierName,
    contractType,
    startDate,
    endDate,
    currency,
    totalValue,
    riskLevel,
    aiStatus,
    aiAnalyzedAt,
    1 as contractCount : Integer,
    virtual daysRemaining : Integer,
    virtual expiryStatus : String(40),
    virtual aiAlert : String(120)
    
    };
    entity ContractItems
    as projection on db.ContractItems;
}

/* =========================================================
    DASHBOARD AGGREGATION
========================================================= */
annotate ContractService.ContractAnalytics with @(
        Aggregation.ApplySupported : {
        Transformations : [
        'aggregate',
        'groupby',
        'filter'
        ],
        GroupableProperties : [
        riskLevel,
        contractType,
        supplierName,
        currency
        ],
            AggregatableProperties : [
                {
                    $Type    : 'Aggregation.AggregatablePropertyType',
                    Property : totalValue
                },
                {
                    $Type    : 'Aggregation.AggregatablePropertyType',
                    Property : contractCount
                }
            ]
        },
        Aggregation.CustomAggregate #totalValue : 'Edm.Decimal'
        )
{
    totalValue @(
        Analytics.Measure,
        Aggregation.default : #SUM
    );

    contractCount @(
        Analytics.Measure,
        Aggregation.default : #SUM
    );
};
