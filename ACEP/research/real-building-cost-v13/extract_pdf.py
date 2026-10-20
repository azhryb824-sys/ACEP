"""Extract the original all-schools tables, never their repeated type summaries.

Column bands are transcribed from rendered headers. Numeric cells are checked
independently with pdfplumber; source coordinates and original text are retained.
No model fitting, target filtering, or label-based split selection occurs here.
"""
from pathlib import Path
import json, re, hashlib
import fitz, pdfplumber

ROOT = Path(__file__).resolve().parent
LAYOUT = {
    2022: dict(pages=[0], facility_left=98, numeric=[195,225,255,280,305,330,362,394,425,459]),
    2023: dict(pages=[0], facility_left=76, numeric=[173,202,232,258,284,309,343,375,407,442]),
    2025: dict(pages=[0,1], facility_left=95, numeric=[187,221,249,274,298,321,352,382,412,449]),
}
KEYS = ['students','teachers','classes_k5','classes_68','classes_912','net_ft2','gross_ft2','architect_fees','contract_cost']

def number(s):
    if not s.strip(): return None
    assert re.fullmatch(r'[0-9,]+(?:\.[0-9]+)?',s), repr(s)
    return float(s.replace(',',''))

def extract():
    rows=[]; cells=[]; checks=0; counts={}
    for year,layout in LAYOUT.items():
        path=ROOT/'sources'/f'schools_{year}.pdf'
        doc=fitz.open(path); secondary=pdfplumber.open(path); count=0
        for pn in layout['pages']:
            page=doc[pn]; words=page.get_text('words'); sp=secondary.pages[pn]; pw=sp.extract_words(x_tolerance=1,y_tolerance=1)
            # pdfplumber preserves a nonzero MediaBox origin; MuPDF normalizes it.
            for w in pw:
                w['x0']-=sp.bbox[0];w['x1']-=sp.bbox[0]
                w['top']-=sp.bbox[1];w['bottom']-=sp.bbox[1]
            anchors=sorted([w for w in words if w[4] in ['1','2','3','4'] and 25<w[0]<40 and w[1]>150],key=lambda w:w[1])
            for an in anchors:
                yc=(an[1]+an[3])/2
                # Numeric entries share a baseline, unlike wrapped facility names.
                near=[w for w in words if abs((w[1]+w[3])/2-yc)<2]
                district=' '.join(w[4] for w in sorted(near,key=lambda w:w[0]) if 40<=w[0]<layout['facility_left'])
                if not district or re.search(r'average|total',district,re.I): continue
                # A wrapped name belongs above its final numeric baseline.
                prev=[(w[1]+w[3])/2 for w in anchors if w[1]<an[1]-.1]
                low=max(prev)+2.2 if prev else yc-4
                namewords=[w for w in words if layout['facility_left']<=w[0]<layout['numeric'][0] and low<(w[1]+w[3])/2<=yc+2]
                facility=' '.join(w[4] for w in sorted(namewords,key=lambda w:(round(w[1],1),w[0])))
                assert facility,(year,pn,district)
                count+=1; pid=f'FDOE-{year}-PDF-{count:03d}'
                row=dict(project_id=pid,year=year,school_type=an[4],district=district,facility=facility,
                         source_file=path.name,source_sheet=f'PDF page {pn+1}',source_row=count,source_page=pn+1,
                         source_y=round(yc,4),project_scope='unverified')
                bounds=layout['numeric']
                for k,l,h in zip(KEYS,bounds,bounds[1:]):
                    selected=[w for w in near if l<=w[0] and w[2]<h]
                    assert len(selected)<=1,(pid,k,selected)
                    raw=''.join(w[4] for w in selected);v=number(raw)
                    sw=[w for w in pw if abs((w['top']+w['bottom'])/2-yc)<2 and l<=w['x0'] and w['x1']<h]
                    raw2=''.join(w['text'] for w in sw);v2=number(raw2)
                    assert v==v2,(pid,k,raw,raw2)
                    checks+=1;row[k]=v
                    cells.append(dict(project_id=pid,field=k,page=pn+1,y=yc,x0=l,x1=h,raw=raw,independent_raw=raw2))
                rows.append(row)
        counts[year]=count;secondary.close();doc.close()
    assert counts=={2022:28,2023:46,2025:65},counts
    (ROOT/'pdf_records.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'pdf_cell_audit.json').write_text(json.dumps({'numeric_checks':checks,'counts':counts,'cells':cells},indent=2)+'\n')
    print(json.dumps({'counts':counts,'independent_numeric_checks':checks,'scope':'unverified for PDF records; not inferred from complement of new construction'}))

if __name__=='__main__': extract()
