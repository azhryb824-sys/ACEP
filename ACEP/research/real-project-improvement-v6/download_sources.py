"""Download public FDOT completed-contract reports. No model fitting."""
from pathlib import Path
import urllib.request,json,hashlib,concurrent.futures
R=Path(__file__).resolve().parent;D=R/'sources';D.mkdir(exist_ok=True)
BASE='https://fdotwww.blob.core.windows.net/sitefinity/docs/default-source/'
FILES={
'FDOT_FY2016_Q4.xlsx':'construction/construction/constadm/reports/cost-and-timenew/fy1516/qtr-4-2015-2016-report230cb5861bab47d9934cfea66a84aeaa.xlsx?sfvrsn=6ed5cd68_0',
'FDOT_FY2017_Q4.xlsx':'construction/construction/constadm/reports/cost-and-timenew/fy1617/qtr-4-2016-2017-report5fe9f23924484f0bb1031abbd06cd02f.xlsx?sfvrsn=843726b1_0',
'FDOT_FY2018_Q4.xlsx':'construction/construction/constadm/reports/cost-and-timenew/fy1718/qtr481e469a2625045f5a31d604599e6d368.xlsx?sfvrsn=2e9cdf1f_0',
'FDOT_FY2020_Q4.xlsx':'construction/constadm/reports/cost-and-timenew/fy1920/qtr4.xlsx?sfvrsn=41c8bdf0_2',
'FDOT_FY2021_Q4.xlsx':'construction/constadm/reports/cost-and-timenew/fy2021/qtr-4-cost-time-report-2020-20211525236309.xlsx?sfvrsn=9cd54361_2',
'FDOT_FY2022_Q4.xlsx':'construction/constadm/reports/cost-and-timenew/fy2122/qtr-4-cost-time-report-2021-2022.xlsx?sfvrsn=24a9b81e_4',
'FDOT_FY2023_Q2.xlsx':'construction/constadm/reports/cost-and-timenew/fy2223/qtr-2-cost-time-report-2022-2023.xlsx?sfvrsn=143472ff_2',
'FDOT_FY2024_Q4.xlsx':'construction/constadm/reports/cost-and-timenew/fy2324/4th-quarter-detail-excel-spreadsheet.xlsx?sfvrsn=8f5921f0_1',
'FDOT_FY2025_Q3.xlsx':'construction/constadm/reports/cost-and-timenew/fy-2024-2025/3rd-qtr-2024_2025-detail-excel-spreadhseet.xlsx?sfvrsn=974e0024_1',
'FDOT_FY2026_Q4.xlsx':'construction/constadm/reports/cost-and-timenew/fy-25-26/qtr4-detail-excel-spreadsheet.xlsx?sfvrsn=b86784f5_1'}
def download(item):
 name,path=item;p=D/name;url=BASE+path
 if not p.exists():p.write_bytes(urllib.request.urlopen(url,timeout=45).read())
 data=p.read_bytes();assert data[:2]==b'PK',name
 print(name,len(data),flush=True)
 return dict(file=name,url=url,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),retrieved='2026-10-19',landing_page='https://www.fdot.gov/construction/constadm/reports',publisher='Florida Department of Transportation')
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:rows=list(ex.map(download,FILES.items()))
 (D/'downloads.json').write_text(json.dumps(rows,indent=2)+'\n')
