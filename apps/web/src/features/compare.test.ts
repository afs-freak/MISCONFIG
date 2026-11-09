import{describe,it,expect}from'vitest';import{compareFindings}from'./compare';
describe('scan finding comparison',()=>{
 it('separates new, existing, resolved and reintroduced rule/file pairs',()=>{const result=compareFindings([{ruleId:'A',filePath:'./config/a.yml'},{ruleId:'B',filePath:'b.yml'},{ruleId:'D',filePath:'d.yml'}],[{ruleId:'A',filePath:'config\\a.yml'},{ruleId:'C',filePath:'c.yml'}],[[{ruleId:'D',filePath:'d.yml'}]]);expect(result).toEqual({newCount:1,existingCount:1,resolvedCount:1,reintroducedCount:1});});
 it('does not classify a rule as resolved when its file separator changes',()=>{expect(compareFindings([{ruleId:'A',filePath:'a\\b.yml'}],[{ruleId:'A',filePath:'a/b.yml'}],[]).existingCount).toBe(1);});
});
