import{describe,it,expect}from'vitest';
import{buildPrompt,validateProviderResponse}from'./ai.js';

describe('AI response boundary',()=>{
 const mockedProviderResponse=JSON.stringify({summary:'This setting is risky.',saferAlternative:'Allow a named origin.',impact:'An untrusted site may call the service.'});
 it('accepts a mocked provider response with the required structure',()=>{expect(validateProviderResponse(mockedProviderResponse).summary).toMatch(/risky/);});
 it('rejects malformed JSON and missing fields from a mocked provider',()=>{expect(()=>validateProviderResponse('not json')).toThrow();expect(()=>validateProviderResponse('{"summary":"incomplete"}')).toThrow();});
 it('constructs a versioned prompt from only the redacted finding summary',()=>{const prompt=buildPrompt({ruleId:'CORS-001',evidence:'origin=*'});expect(prompt).toContain('MISCONFIG advisory prompt v1');expect(prompt).toContain('CORS-001');});
});
