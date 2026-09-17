'use strict';
const {CADParserService}=require('../packages/ai-services/cad-parser/dist');
const {BIMParserService}=require('../packages/ai-services/bim-parser/dist');
const {EmbeddingService}=require('../packages/ai-services/embeddings/dist');
const axios=require('axios');
test('F10: invalid CAD fails explicitly; DXF counts entities without invented areas',async()=>{
 const cad=new CADParserService();await cad.initialize();
 expect(()=>cad.parseDWG(Buffer.from('invalid binary'))).toThrow();
 const data='0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nA-WALL\n10\n0\n20\n0\n11\n1\n21\n0\n0\nCIRCLE\n8\nA-WALL\n10\n0\n20\n0\n40\n2\n0\nENDSEC\n0\nEOF\n';
 const parsed=cad.parseDWG(data);expect(parsed.entities).toHaveLength(2);expect(parsed.layers[0].entityCount).toBe(2);expect(parsed.layers[0].estimatedArea).toBeNull();
 expect(()=>cad.convertToBuildingModel(parsed)).toThrow('verified_geometry_adapter_required');
});
test('F10: BIM requires declared measurement units and preserves floor area once',async()=>{
 const bim=new BIMParserService();await bim.initialize();
 expect(()=>bim.parseIFC('not an IFC file')).toThrow();
 const input={units:{area:'m2',volume:'m3'},spaces:[{id:'A',name:'Room',area:12,volume:36,floor:2}]};
 expect(bim.convertToBOQ(bim.parseIFC(input),'villa',999,10)[0].quantity).toBe(12);
 expect(()=>bim.parseIFC({...input,units:{area:'ft2',volume:'ft3'}})).toThrow();
 expect(()=>bim.parseIFC({...input,spaces:[input.spaces[0],input.spaces[0]]})).toThrow();
 const metadata=bim.parseIFC("ISO-10303-21;HEADER;FILE_SCHEMA(('IFC4'));ENDSEC;DATA;#1=IFCWALL('A');ENDSEC;END-ISO-10303-21;");
 expect(()=>bim.convertToBOQ(metadata)).toThrow('bim_quantities_unavailable');
});
test('F15: provider errors and dimensional changes never fall back to synthetic embeddings',async()=>{
 const s=new EmbeddingService();await s.initialize();await expect(s.generateEmbedding('test')).rejects.toThrow('not_configured');
 await s.initialize({provider:'openai',apiKey:'test-only',dimensions:3});
 jest.spyOn(axios,'post').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({data:{data:[{embedding:[1,2]}]}});
 await expect(s.generateEmbedding('test')).rejects.toThrow('provider_failed');
 await expect(s.generateEmbedding('test')).rejects.toThrow('dimensions');
 const local=new EmbeddingService();await local.initialize({provider:'synthetic'});await local.indexDocument('sample');
 await expect(local.initialize({provider:'openai'})).rejects.toThrow('space_change');
});
