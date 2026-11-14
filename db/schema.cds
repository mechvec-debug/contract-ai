namespace contract.ai;
using { cuid, managed } from '@sap/cds/common';
entity Contracts : cuid, managed {
contractNo : String(10);

supplierNo : String(10);
supplierName : String(100);

contractType : String(2);
startDate : Date;
endDate : Date;
currency : String(3);
totalValue : Decimal(15,2);
riskLevel : String(20);
aiSummary : LargeString;
riskAnalysis : LargeString;
recommendation : LargeString;
aiStatus     : String(20);
aiAnalyzedAt : Timestamp;

items : Composition of many ContractItems
on items.parent = $self;
}
entity ContractItems : cuid {
    parent      : Association to Contracts;
    itemNo      : Integer;
    material    : String(40);
    shortText   : String(255);
    description : String(1000);
    quantity    : Decimal(13,2);
    orderUnit   : String(3);
    unitPrice   : Decimal(15,2);
    value       : Decimal(15,2);
    plant       : String(4);
    aiSummary   : LargeString;
}
