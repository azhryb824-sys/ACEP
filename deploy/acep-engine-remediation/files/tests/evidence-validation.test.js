'use strict';
const {validatePriceBook,validateStandardsRegister}=require('../packages/governance/evidence-validation');
const {evaluate,wilson}=require('../scripts/evaluate-real-projects');
test('F18: stale prices, missing sources, and unspecified standard clauses are rejected',()=>{
 expect(validatePriceBook({schemaVersion:1,currency:'SAR',city:'Riyadh',asOf:'2024-01-01',validUntil:'2024-12-31',rates:[]}).valid).toBe(false);
 expect(validateStandardsRegister({standards:[{code:'SBC'}]}).valid).toBe(false);
});
test('F06/F14: abstention counts as failure, duplicate projects and training leakage are rejected',()=>{
 const row={projectId:'A',inputs:{projectType:'villa',city:'Riyadh'},actuals:{costSar:100},units:{costSar:'SAR'},source:{owner:'owner',license:'licensed',reference:'contract-1',sha256:'a'.repeat(64)},provenance:'real_completed_project',contractorId:'C1',period:'2025',areaBasis:'gross_floor_area',scope:'full_project',independentBaseline:{costSar:105}};
 const policy={targets:{costSar:{unit:'SAR',relativeError:0.02}},minimumProjects:1,requiredSuccessRate:0.98,requiredProjectTypes:['villa']};
 const model={predict:()=>({available:false})};
 const report=evaluate([row],policy,[],model);
 expect(report.abstained).toBe(1); expect(report.metrics['all/costSar'].successRate).toBe(0); expect(report.numericalGatePassed).toBe(false);
 expect(report.metrics['all/costSar'].independentBaselineMae).toBe(5);
 expect(()=>evaluate([row,row],policy,[],model)).toThrow('Duplicate');
 expect(()=>evaluate([row],policy,['A'],model)).toThrow('overlapping');
 expect(wilson(98,100)[0]).toBeLessThan(0.98);
});
