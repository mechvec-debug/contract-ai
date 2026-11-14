using ContractService as service from '../../srv/service';

/* =========================================================
   HIDE TECHNICAL FIELDS
   ========================================================= */
annotate service.Contracts with {
    ID @UI.Hidden : true;

    supplierNo @(
        Common.Text            : supplierName,
        Common.TextArrangement : #TextFirst
    );
};

annotate service.ContractItems with {
    ID     @UI.Hidden : true;
    parent @UI.Hidden : true;
};

/* =========================================================
   CONTRACT HEADER ANNOTATIONS
   ========================================================= */
annotate service.Contracts with @(
    UI.HeaderInfo : {
        TypeName       : 'Contract',
        TypeNamePlural : 'Contracts',
        Title : {
            $Type : 'UI.DataField',
            Value : contractNo
        },
        Description : {
            $Type : 'UI.DataField',
            Value : supplierNo
        }
    },
    /* =====================================================
       OBJECT PAGE ACTIONS
       ===================================================== */

    UI.Identification : [
        {
            $Type : 'UI.DataFieldForAction',
            Label : 'Run AI Analysis',
            Action : 'ContractService.runAIAnalysis',
            ![@UI.Importance] : #High
        }
    ],

    UI.SelectionFields : [
        contractNo,
        supplierNo,
        supplierName,
        contractType,
        riskLevel
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Contract Number',
            Value : contractNo
        },
        {
            $Type : 'UI.DataField',
            Label : 'Supplier',
            Value : supplierNo
        },
        {
            $Type : 'UI.DataField',
            Label : 'Contract Type',
            Value : contractType
        },
        {
            $Type : 'UI.DataField',
            Label : 'Start Date',
            Value : startDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'End Date',
            Value : endDate
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
        },
        {
        $Type : 'UI.DataField',
        Label : 'Risk Level',
        Value : riskLevel,
        Criticality : riskCriticality
        }
    ],

    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Contract Number',
                Value : contractNo
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
                Label : 'Start Date',
                Value : startDate
            },
            {
                $Type : 'UI.DataField',
                Label : 'End Date',
                Value : endDate
            },
            {
                $Type : 'UI.DataField',
                Label : 'Currency',
                Value : currency
            },
            {
                $Type : 'UI.DataField',
                Label : 'Total Value',
                Value : totalValue
            },
            {
            $Type : 'UI.DataField',
            Label : 'Risk Level',
            Value : riskLevel,
            Criticality : riskCriticality
            }
                    ]
    },

    UI.FieldGroup #AIAssessment : {
        $Type : 'UI.FieldGroupType',
        Data : [
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
                Label : 'AI Assessment',
                Value : aiSummary
            }
        ]
    },

    UI.FieldGroup #RiskAnalysis : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Risk Analysis',
                Value : riskAnalysis
            }
        ]
    },

    UI.FieldGroup #Recommendation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Recommendation',
                Value : recommendation
            }
        ]
    },

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'GeneralInformation',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#GeneralInformation'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ContractItems',
            Label  : 'Contract Items',
            Target : 'items/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'AIAssessment',
            Label  : 'AI Assessment',
            Target : '@UI.FieldGroup#AIAssessment'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'RiskAnalysis',
            Label  : 'Risk Analysis',
            Target : '@UI.FieldGroup#RiskAnalysis'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'Recommendation',
            Label  : 'Recommendation',
            Target : '@UI.FieldGroup#Recommendation'
        }
    ]
);

/* =========================================================
   CONTRACT ITEM ANNOTATIONS
   ========================================================= */
annotate service.ContractItems with @(
    UI.HeaderInfo : {
        TypeName       : 'Contract Item',
        TypeNamePlural : 'Contract Items',
        Title : {
            $Type : 'UI.DataField',
            Value : itemNo
        },
        Description : {
            $Type : 'UI.DataField',
            Value : shortText
        }
    },

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Item',
            Value : itemNo
        },
        {
            $Type : 'UI.DataField',
            Label : 'Material',
            Value : material
        },
        {
            $Type : 'UI.DataField',
            Label : 'Short Text',
            Value : shortText
        },
        {
            $Type : 'UI.DataField',
            Label : 'Quantity',
            Value : quantity
        },
        {
            $Type : 'UI.DataField',
            Label : 'Order Unit',
            Value : orderUnit
        },
        {
            $Type : 'UI.DataField',
            Label : 'Unit Price',
            Value : unitPrice
        },
        {
            $Type : 'UI.DataField',
            Label : 'Item Value',
            Value : value
        },
        {
            $Type : 'UI.DataField',
            Label : 'Plant',
            Value : plant
        }
    ],

    UI.FieldGroup #ItemDetails : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Item Number',
                Value : itemNo
            },
            {
                $Type : 'UI.DataField',
                Label : 'Material',
                Value : material
            },
            {
                $Type : 'UI.DataField',
                Label : 'Short Text',
                Value : shortText
            },
            {
                $Type : 'UI.DataField',
                Label : 'Quantity',
                Value : quantity
            },
            {
                $Type : 'UI.DataField',
                Label : 'Order Unit',
                Value : orderUnit
            },
            {
                $Type : 'UI.DataField',
                Label : 'Unit Price',
                Value : unitPrice
            },
            {
                $Type : 'UI.DataField',
                Label : 'Item Value',
                Value : value
            },
            {
                $Type : 'UI.DataField',
                Label : 'Plant',
                Value : plant
            }
        ]
    },

    UI.FieldGroup #AISummary : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'AI Summary',
                Value : aiSummary
            }
        ]
    },

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ItemDetails',
            Label  : 'Item Details',
            Target : '@UI.FieldGroup#ItemDetails'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'AISummary',
            Label  : 'AI Summary',
            Target : '@UI.FieldGroup#AISummary'
        }
    ]
);
/* =========================================================
   RUN AI ANALYSIS SIDE EFFECTS
   Refresh AI fields after the bound action is completed
   ========================================================= */

        annotate service.Contracts actions {
            runAIAnalysis @Common.SideEffects : {
                TargetProperties : [
                    'aiSummary',
                    'riskAnalysis',
                    'recommendation',
                    'aiStatus',
                    'aiAnalyzedAt'
                ]
            };
        };

