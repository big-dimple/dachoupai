import {expect,it} from 'vitest';
import {settlementHeatText,exactSettlementHeatText} from '../src/game/SettlementNumbers';

it.each([
 ['3193089021','约31.93亿'],['217098850','约2.17亿'],['12740199','约1274.02万'],
 ['19110298','约1911.03万'],['733884590','约7.34亿'],['100000000','1亿'],
 ['9999','9,999'],['10000','1万'],['0','0'],['-3193089021','约-31.93亿'],
 ['1952400131333767','约1.95e15'],['999999999999999999','约1e18'],
 ['10000000000000000000000000000000000000000','1e40'],
])('formats %s as a single compact receipt %s without Number conversion',(value,expected)=>{
 expect(settlementHeatText(value)).toBe(expected);expect(settlementHeatText(value)).not.toMatch(/[\r\n]/);
 expect(exactSettlementHeatText(value).replaceAll(',','')).toBe(BigInt(value).toString());
});
it('rounds half units consistently while details retain every original digit',()=>{
 expect(settlementHeatText('3193499999')).toBe('约31.93亿');
 expect(settlementHeatText('3193500000')).toBe('约31.94亿');
 expect(exactSettlementHeatText('3193500000')).toBe('3,193,500,000');
});
