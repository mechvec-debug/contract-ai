using ContractService as service from '../../srv/service';

/* =========================================================
   CONTRACT ANALYTICS DASHBOARD
   ========================================================= */

annotate service.ContractAnalytics with @(

    UI.HeaderInfo : {
        TypeName       : 'Contract',
        TypeNamePlural : 'Contract Analytics'
    },

    /* =====================================================
       DASHBOARD FILTERS
       ===================================================== */

    UI.SelectionFields : [
        contractNo,
        supplierNo,
        supplierName,
        contractType,
        riskLevel,
        aiStatus,
        currency,
        endDate
    ],

    /* =====================================================
       ANALYTICAL TABLE
       ===================================================== */

    UI.LineItem : [
        {
            $Type          : 'UI.DataFieldWithIntentBasedNavigation',
            Label          : 'Contract Number',
            Value          : contractNo,
            SemanticObject : 'Contract',
            Action         : 'display'
        },
        {
            $Type : 'UI.DataField',
            Label : 'Supplier Number',
            Value : supplierNo
        },
        {
            $Type : 'UI.DataField',
            Label : 'Supplier Name',
            Value : supplierName
        },
        {
            $Type : 'UI.DataField',
            Label : 'Contract Type',
            Value : contractType
        },
        {
            $Type : 'UI.DataField',
            Label : 'End Date',
            Value : endDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Days Remaining',
            Value : daysRemaining
        },
        {
            $Type : 'UI.DataField',
            Label : 'Expiry Alert',
            Value : expiryStatus
        },
        {
            $Type : 'UI.DataField',
            Label : 'Risk Level',
            Value : riskLevel
        },
        {
            $Type : 'UI.DataField',
            Label : 'AI Status',
            Value : aiStatus
        },
        {
            $Type : 'UI.DataField',
            Label : 'Last AI Analysis',
            Value : aiAnalyzedAt
        },
        {
            $Type : 'UI.DataField',
            Label : 'AI Alert',
            Value : aiAlert
        },
        {
            $Type : 'UI.DataField',
            Label : 'Total Value',
            Value : totalValue
        },
        {
            $Type : 'UI.DataField',
            Label : 'Currency',
            Value : currency
        }
    ],

    /* =====================================================
       AGGREGATED MEASURE
       ===================================================== */

    Analytics.AggregatedProperty #TotalContractValue : {
        $Type                : 'Analytics.AggregatedPropertyType',
        Name                 : 'TotalContractValue',
        AggregationMethod    : 'sum',
        AggregatableProperty : totalValue,
        ![@Common.Label]     : 'Total Contract Value'
    },

    /* =====================================================
       TOTAL CONTRACTS AGGREGATED MEASURE
       ===================================================== */

    Analytics.AggregatedProperty #TotalContracts : {
        $Type                : 'Analytics.AggregatedPropertyType',
        Name                 : 'TotalContracts',
        AggregationMethod    : 'sum',
        AggregatableProperty : contractCount,
        ![@Common.Label]     : 'Total Contracts'
    },

    /* =====================================================
       TOTAL CONTRACTS DATA POINT
       ===================================================== */

    UI.DataPoint #TotalContracts : {
        $Type       : 'UI.DataPointType',
        Title       : 'Total Contracts',
        Description : 'Number of contracts in the portfolio',
        Value       : TotalContracts
    },

    /* =====================================================
       TOTAL CONTRACTS SELECTION VARIANT
       ===================================================== */

    UI.SelectionVariant #TotalContracts : {
        $Type : 'UI.SelectionVariantType',
        Text  : 'All Contracts'
    },

    /* =====================================================
       TOTAL CONTRACTS KPI
       ===================================================== */

    UI.KPI #TotalContracts : {
        $Type            : 'UI.KPIType',
        ID               : 'TotalContractsKPI',
        ShortDescription : 'Total number of contracts',
        DataPoint        : ![@UI.DataPoint#TotalContracts],
        SelectionVariant : ![@UI.SelectionVariant#TotalContracts]
    },

    /* =====================================================
       CRITICAL CONTRACTS SELECTION VARIANT
       ===================================================== */

    UI.SelectionVariant #CriticalContracts : {
        $Type : 'UI.SelectionVariantType',
        Text  : 'Critical Contracts',

        SelectOptions : [
            {
                $Type        : 'UI.SelectOptionType',
                PropertyName : riskLevel,

                Ranges : [
                    {
                        $Type  : 'UI.SelectionRangeType',
                        Sign   : #I,
                        Option : #EQ,
                        Low    : 'Critical'
                    }
                ]
            }
        ]
    },


    /* =====================================================
       CRITICAL CONTRACTS DATA POINT
       Uses existing TotalContracts aggregated measure
       ===================================================== */

    UI.DataPoint #CriticalContracts : {
        $Type       : 'UI.DataPointType',
        Title       : 'Critical Contracts',
        Description : 'Contracts classified as Critical',
        Value       : TotalContracts,
        Criticality : #Negative
    },


    /* =====================================================
       CRITICAL CONTRACTS KPI
       ===================================================== */

    UI.KPI #CriticalContracts : {
        $Type            : 'UI.KPIType',
        ID               : 'CriticalContractsKPI',
        ShortDescription : 'Critical Contracts',
        DataPoint        : ![@UI.DataPoint#CriticalContracts],
        SelectionVariant : ![@UI.SelectionVariant#CriticalContracts]
    },

    /* =====================================================
       RISK DISTRIBUTION CHART
       ===================================================== */

    UI.Chart #RiskDistribution : {
        $Type       : 'UI.ChartDefinitionType',
        Title       : 'Contract Value by Risk Level',
        Description : 'Distribution of contract value across risk levels',
        ChartType   : #Donut,

        Dimensions : [
            riskLevel
        ],

        DynamicMeasures : [
            '@Analytics.AggregatedProperty#TotalContractValue'
        ],

        DimensionAttributes : [
            {
                $Type     : 'UI.ChartDimensionAttributeType',
                Dimension : riskLevel,
                Role      : #Category
            }
        ],

        MeasureAttributes : [
            {
                $Type          : 'UI.ChartMeasureAttributeType',
                DynamicMeasure : '@Analytics.AggregatedProperty#TotalContractValue',
                Role           : #Axis1
            }
        ]
    },

    /* =====================================================
       CONTRACT TYPE DISTRIBUTION CHART
       ===================================================== */

    UI.Chart #ContractTypeDistribution : {
        $Type       : 'UI.ChartDefinitionType',
        Title       : 'Contract Value by Contract Type',
        Description : 'Distribution of contract value across contract types',
        ChartType   : #Column,

        Dimensions : [
            contractType
        ],

        DynamicMeasures : [
            '@Analytics.AggregatedProperty#TotalContractValue'
        ],

        DimensionAttributes : [
            {
                $Type     : 'UI.ChartDimensionAttributeType',
                Dimension : contractType,
                Role      : #Category
            }
        ],

        MeasureAttributes : [
            {
                $Type          : 'UI.ChartMeasureAttributeType',
                DynamicMeasure : '@Analytics.AggregatedProperty#TotalContractValue',
                Role           : #Axis1
            }
        ]
    },

    /* =====================================================
       TOP SUPPLIERS BY CONTRACT VALUE
       ===================================================== */

    UI.Chart #TopSuppliers : {
        $Type       : 'UI.ChartDefinitionType',
        Title       : 'Top Suppliers by Contract Value',
        Description : 'Contract value exposure by supplier',
        ChartType   : #Bar,

        Dimensions : [
            supplierName
        ],

        DynamicMeasures : [
            '@Analytics.AggregatedProperty#TotalContractValue'
        ],

        DimensionAttributes : [
            {
                $Type     : 'UI.ChartDimensionAttributeType',
                Dimension : supplierName,
                Role      : #Category
            }
        ],

        MeasureAttributes : [
            {
                $Type          : 'UI.ChartMeasureAttributeType',
                DynamicMeasure : '@Analytics.AggregatedProperty#TotalContractValue',
                Role           : #Axis1
            }
        ]
    },

    /* =====================================================
       DEFAULT ANALYTICAL LIST PAGE PRESENTATION
       Keep this connected to manifest.json
       ===================================================== */

    UI.PresentationVariant #Dashboard : {
        $Type : 'UI.PresentationVariantType',
        Text  : 'Contract Analysis Dashboard',

        Visualizations : [
            '@UI.Chart#RiskDistribution',
            '@UI.LineItem'
        ]
    },

    /* =====================================================
       CONTRACT TYPE ANALYTICAL VIEW
       Defined for later reuse; not connected in manifest
       ===================================================== */

    UI.PresentationVariant #ContractTypeDashboard : {
        $Type : 'UI.PresentationVariantType',
        Text  : 'Contract Type Analysis',

        Visualizations : [
            '@UI.Chart#ContractTypeDistribution',
            '@UI.LineItem'
        ]
    },

    /* =====================================================
       TOP SUPPLIERS ANALYTICAL VIEW
       Defined for later reuse; not connected in manifest
       ===================================================== */

    UI.PresentationVariant #TopSuppliersDashboard : {
        $Type : 'UI.PresentationVariantType',
        Text  : 'Top Suppliers',

        SortOrder : [
            {
                $Type      : 'Common.SortOrderType',
                Property   : totalValue,
                Descending : true
            }
        ],

        Visualizations : [
            '@UI.Chart#TopSuppliers',
            '@UI.LineItem'
        ]
    }

);
