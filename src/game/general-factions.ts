// 무장의 소속 진영(장수 · 편성 화면의 진영 깃발 · 진영 거르기). 목록에 없는 무장은 군웅.
export type Realm = 'shu' | 'wei' | 'wu' | 'qun'
export const REALM_LABEL: Record<Realm, string> = { shu: '촉', wei: '위', wu: '오', qun: '군웅' }

const SHU = ['liu-bei', 'guan-yu', 'zhang-fei', 'zhao-yun', 'zhuge-liang', 'huang-zhong', 'ma-chao', 'wei-yan', 'pang-tong', 'xu-shu', 'fa-zheng', 'wang-ping', 'guan-ping', 'guan-xing', 'zhang-bao', 'ma-dai', 'guan-yinping']
const WEI = ['cao-cao', 'simayi', 'xiahou-dun', 'wen-ping', 'zhang-liao', 'xu-chu', 'dian-wei', 'cao-ren', 'cao-hong', 'guo-jia', 'xun-yu', 'xun-you', 'jia-xu', 'cheng-yu', 'pang-de', 'xu-huang', 'yue-jin', 'li-dian', 'yu-jin', 'zhang-he', 'cai-wenji']
const WU = ['sun-quan', 'sun-ce', 'sun-jian', 'zhou-yu', 'taishi-ci', 'huang-gai', 'gan-ning', 'ling-tong', 'lu-su', 'lu-meng', 'lu-xun', 'da-qiao', 'xiao-qiao', 'sun-shangxiang']

const MAP = new Map<string, Realm>([...SHU.map(id => [id, 'shu'] as const), ...WEI.map(id => [id, 'wei'] as const), ...WU.map(id => [id, 'wu'] as const)])

/** 무장 id(같은 무장의 변형 id 포함)로 진영을 찾는다 */
export function generalRealm(id: string): Realm {
  if (MAP.has(id)) return MAP.get(id)!
  for (const [key, realm] of MAP) if (id.startsWith(`${key}-`)) return realm
  return 'qun'
}
