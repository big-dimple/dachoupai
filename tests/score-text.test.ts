import {describe,it,expect} from 'vitest';
import {readableFractionText as read,exactFractionText as exact,readableScoreFormula,accumulatorRollValue,heatText} from '../src/game/scoreText';
const f=(n:string,d='1')=>({n,d});
describe('readable first layer / exact audit',()=>{
 it('shows the two reported natural values without claiming to replay their runs',()=>{
  expect(read(f('36639','64'))).toBe('≈572.48');expect(exact(f('36639','64'))).toBe('36,639/64');
  expect(read(f('839523','320000'))).toBe('≈2.62');expect(exact(f('839523','320000'))).toBe('839,523/320,000');
 });
 it.each([['0','3','0'],['10','2','5'],['297','2','148.5'],['123','100','1.23'],['1','3','≈0.33'],['75','8','≈9.38'],['9995','1000','≈10'],['-9995','1000','≈-10'],['-1','3','≈-0.33'],['1','-2','-0.5']])('rounds %s/%s honestly',(n,d,text)=>expect(read(f(n,d))).toBe(text));
 it('keeps small nonzero values visible, with exact tiny decimals unmarked',()=>{
  expect(read(f('1','1000000'))).toBe('1e-6');expect(read(f('1','3000000'))).toBe('≈3.33e-7');
  expect(read(f('-1','3'+'0'.repeat(400)))).toBe('≈-3.33e-401');
  expect(read(f('9999','1000000'))).toBe('≈1e-2');
 });
 it('handles thousand-digit integers/ratios, scientific carry and exact mantissas without Number',()=>{
  expect(read(f('123'+'0'.repeat(398)))).toBe('1.23e400');
  expect(read(f('9'.repeat(401)))).toBe('≈1e401');
  expect(read(f('-'+'9'.repeat(401)))).toBe('≈-1e401');
  expect(read(f('123'+'0'.repeat(398),'1'+'0'.repeat(398)))).toBe('123');
  expect(read(f('1'+'0'.repeat(4095)))).toBe('1e4095');
 });
 it('preserves every digit in exact detail even beyond the old scientific limit',()=>{
  const n='12345678901234567890123456790';
  expect(exact(f(n,'7')).replaceAll(',','')).toBe(n+'/7');
  expect(exact(f('1','1000000'))).toBe('1/1,000,000');expect(exact(f('75','8'))).toBe('9.375');
 });
 it('rejects invalid denominators and converts only bounded interpolation inputs',()=>{
  expect(()=>read(f('1','0'))).toThrow(RangeError);expect(()=>exact(f('1','0'))).toThrow(RangeError);
  expect(accumulatorRollValue(f('3','2'))).toBe(1.5);
  expect(accumulatorRollValue(f('1'+'0'.repeat(400),'1'+'0'.repeat(400)))).toBeUndefined();
 });
 it('links rounded factors to the saved floor receipt without an equality, leaving heat thresholds intact',()=>{
  expect(readableScoreFormula(f('781'),f('36639','64'),'447110')).toBe('781 × ≈572.48 · 入账 447,110');
  expect(heatText('123456789012345')).toBe('123,456,789,012,345');expect(heatText('1234567890123456')).toBe('1.23e15');
 });
});
