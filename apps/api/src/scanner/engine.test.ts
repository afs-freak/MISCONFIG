import {describe,it,expect} from 'vitest';
import {correlate,redact,scanFiles} from './engine.js';

const secret={path:'compose.yml',content:'services:\n  db:\n    ports: ["5432:5432"]\n    environment:\n      DB_PASSWORD: "example-test-password-123"\n'};
describe('deterministic scanner',()=>{
 it('detects explicit database exposure and secret-like configuration, with redacted evidence',()=>{const result=scanFiles([secret]);expect(result.findings.map(f=>f.ruleId)).toEqual(expect.arrayContaining(['PORT-001','SECRET-001']));expect(JSON.stringify(result)).not.toContain('example-test-password-123');});
 it('creates a relationship only when both required findings exist',()=>{const two=scanFiles([{path:'compose.yml',content:'ports: ["5432:5432"]\npassword: "example-test-password-123"'}]).findings;expect(correlate(two).map(x=>x.ruleId)).toContain('REL-DB-001');const one=scanFiles([{path:'compose.yml',content:'ports: ["5432:5432"]'}]).findings;expect(correlate(one).map(x=>x.ruleId)).not.toContain('REL-DB-001');});
 it('does not report debug or CORS on unrelated prose',()=>{expect(scanFiles([{path:'readme.yml',content:'# debug is disabled in our process\n# CORS wildcard is mentioned in this note'}]).findings).toEqual([]);});
 it('ignores commented-out unsafe examples while detecting active settings',()=>{expect(scanFiles([{path:'app.yml',content:'# debug: true\n# privileged: true'}]).findings).toEqual([]);expect(scanFiles([{path:'app.yml',content:'debug: true'}]).findings.map(f=>f.ruleId)).toContain('DEBUG-001');});
 it('redacts common credential-shaped values and provider tokens',()=>{expect(redact('API_KEY=sample-credential-987654')).toContain('[REDACTED]');expect(redact('sk-test-token-123456789012')).toBe('[REDACTED]');});
});
