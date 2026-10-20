from pathlib import Path
import json,hashlib,shutil,sys
ROOT=Path(sys.argv[1])
import gzip
EXPECTED_PLAIN={'test_features.csv.gz': '6f6ba949112dd830b63ba6b0be36c17e1297a0b6d99217e14e8efd1434a8c98f', 'test_labels.csv.gz': 'bd6936fe39fab1ac78b874043528dac7e3f3fd0aea556e5da54e6a085e6b5a43', 'train_labels.csv.gz': '903d7697869c8413dca497152aa41ae16dcd9ad1900087100abec23f808596e0', 'validation_labels.csv.gz': '186e6e4ea1efbda22b7dac67c42a2270f854d253f56ec2da6a108ff572b34ec8', 'train_features.csv.gz': 'c7a64b5579c07c9a1e58605737e076c5413a04f5390d742df4a92580c45b9086', 'validation_features.csv.gz': 'c5547050c9918908173bf02fe6ae3f0728852036ae88aa7167888826519f49c7'}
original_manifest=json.loads((ROOT/"data/manifest.json").read_text())
normalized=original_manifest.copy();audit_transport={}
for name,h in EXPECTED_PLAIN.items():
    target=ROOT/"data"/name
    if target.exists():
        assert hashlib.sha256(gzip.decompress(target.read_bytes())).hexdigest()==h,name
    else:
        plain=target.with_suffix("")
        assert plain.is_file(),str(plain)
        payload=plain.read_bytes()
        assert hashlib.sha256(payload).hexdigest()==h,name
        target.write_bytes(gzip.compress(payload,mtime=0))
        plain.unlink()
    normalized[name]=hashlib.sha256(target.read_bytes()).hexdigest()
    audit_transport[name]={"original_gzip_sha256":original_manifest[name],"restored_gzip_sha256":normalized[name],"verified_csv_sha256":h}
(ROOT/"data/manifest.json").write_text(json.dumps(normalized,indent=2)+"\n")
(ROOT/"transport_audit.json").write_text(json.dumps(audit_transport,indent=2)+"\n")
(ROOT/"results").mkdir(exist_ok=True)
shutil.copy2(ROOT/"transport_audit.json",ROOT/"results/transport_audit.json")
print("Verified exact decompressed bytes for",len(EXPECTED_PLAIN),"CSV files; no split or label changes.")
