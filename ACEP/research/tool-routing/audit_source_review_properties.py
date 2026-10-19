"""Metamorphic checks of labelled evidence, not model accuracy or a blind test."""
from decimal import Decimal
from pathlib import Path
import hashlib,json,random
from net_area_source_review import review


def proposal(gross,openings):
    return dict(action='call',tool='net_area',arguments=dict(gross_m2=str(gross),openings_m2=str(openings)),missing_fields=[])


def main():
    rng=random.Random(190735);results=[]
    for i in range(200):
        gross=Decimal(rng.randrange(1000000,900000000))/1000000
        openings=Decimal(rng.randrange(0,int(gross*1000000)+1))/1000000
        gap=Decimal(rng.randrange(1,1000))/1000000
        if i%2:
            text=f'ملف رقم {870000+i}. الفتحات: {openings} م²؛ الإجمالي: {gross} م². مطلوب الصافي.'
            invalid=f'ملف رقم {870000+i}. الفتحات: {gross+gap} م²؛ الإجمالي: {gross} م². مطلوب الصافي.'
        else:
            text=f'Record {870000+i}. Gross area: {gross} m2; openings: {openings} m2. Net area.'
            invalid=f'Record {870000+i}. Gross area: {gross} m2; openings: {gross+gap} m2. Net area.'
        checks=[('correct',text,proposal(gross,openings),'consistent_evidence'),
                ('fabricated_value',text,proposal(gross+gap,openings),'veto'),
                ('invalid_source_repaired_by_model',invalid,proposal(gross+gap,gross),'veto')]
        for kind,source,prediction,status in checks:
            result=review(source,prediction)
            passed=result['status']==status and result['authorization_granted'] is False and result['calculation_executed'] is False
            for evidence in result.get('evidence',{}).values():
                passed=passed and source[evidence['start']:evidence['end']]==evidence['quote']
            results.append(dict(id=f'{kind}-{i}',passed=passed,observed_status=result['status']))
    report=dict(total=len(results),passed=sum(r['passed'] for r in results),failures=[r for r in results if not r['passed']],
                seed=190735,scope='metamorphic labelled grammar checks; not an independent model or engineering test',
                reviewer_sha256=hashlib.sha256(Path(__file__).with_name('net_area_source_review.py').read_bytes()).hexdigest(),
                authorization_granted=False,tools_executed=False)
    target=Path(__file__).with_name('source-review-results')/'property_report.json';target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));assert not report['failures']


if __name__=='__main__':main()
