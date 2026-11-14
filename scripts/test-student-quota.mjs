import { calculateStudentEvents, checkStudentQuota } from '../lib/utils/studentIdentity.ts';
import { isCategoryMatching } from '../lib/types/fest.ts';

console.log('🧪 Running Student Quota Verification Tests (Rule 16 & Rule 17)...\n');

const mockStudent = {
  id: 'stu-1',
  admission_no: '20905',
  cic_no: 20905,
  name: 'Test Candidate',
  phase: 'Aliya',
  college_affl_no: 76
};

// Aliya quotas: on_max=3, off_max=4, total_max=7, group_max=4
const mockQuotas = [
  { phase: 'Aliya', off_max: 4, on_max: 3, total_max: 7, group_max: 4 },
  { phase: 'Thamheediyya', off_max: 4, on_max: 3, total_max: 7, group_max: 3 },
  { phase: 'Foundation', off_max: 4, on_max: 3, total_max: 7, group_max: 2 },
  { phase: 'General', off_max: 2, on_max: 2, total_max: 2, group_max: 3 }
];

// 4 Individual Offstage Events
const offstageIndItems = [
  { item_id: 101, item_code: 'AL101', name_eng: 'Essay Writing', mode: 'offstage', point_type: 'individual', phase: 'Aliya' },
  { item_id: 102, item_code: 'AL102', name_eng: 'Short Story', mode: 'offstage', point_type: 'individual', phase: 'Aliya' },
  { item_id: 103, item_code: 'AL103', name_eng: 'Versification', mode: 'offstage', point_type: 'individual', phase: 'Aliya' },
  { item_id: 104, item_code: 'AL104', name_eng: 'Translation', mode: 'offstage', point_type: 'individual', phase: 'Aliya' }
];

// Group Offstage Event
const groupOffstageItem = {
  item_id: 87,
  item_code: 'AF087',
  name_eng: 'Data Analysis',
  mode: 'offstage',
  point_type: 'group',
  phase: 'Aliya'
};

// Group Onstage Event
const groupOnstageItem = {
  item_id: 88,
  item_code: 'GN088',
  name_eng: 'Kavyappayattu',
  mode: 'onstage',
  point_type: 'group',
  phase: 'General'
};

// General Category Individual Event
const generalIndItem1 = {
  item_id: 201,
  item_code: 'GN201',
  name_eng: 'General Quiz',
  mode: 'offstage',
  point_type: 'individual',
  phase: 'General'
};

const generalIndItem2 = {
  item_id: 202,
  item_code: 'GN202',
  name_eng: 'General Debate',
  mode: 'onstage',
  point_type: 'individual',
  phase: 'General'
};

const generalIndItem3 = {
  item_id: 203,
  item_code: 'GN203',
  name_eng: 'General Oratory',
  mode: 'onstage',
  point_type: 'individual',
  phase: 'General'
};

const allItems = [
  ...offstageIndItems,
  groupOffstageItem,
  groupOnstageItem,
  generalIndItem1,
  generalIndItem2,
  generalIndItem3
];

let failed = false;
function assert(condition, testName, extraInfo = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName} - ${extraInfo}`);
    failed = true;
  }
}

// Case 1: Student has 4 individual offstage items.
const registrations4Off = offstageIndItems.map(item => ({
  id: `reg-${item.item_id}`,
  item_id: item.item_id,
  college_affl_no: 76,
  chest_no: 'ST-20905',
  item
}));

// Test 1a: Should be allowed to join a GROUP offstage event (AF087 Data Analysis)
const res1a = checkStudentQuota(mockStudent, groupOffstageItem, registrations4Off, allItems, mockQuotas);
assert(res1a.allowed, '4 Ind Offstage -> Group Offstage is ALLOWED', res1a.reason);

// Test 1b: Should be BLOCKED from 5th individual offstage event
const fifthIndOff = { item_id: 105, item_code: 'AL105', name_eng: 'Review', mode: 'offstage', point_type: 'individual', phase: 'Aliya' };
const res1b = checkStudentQuota(mockStudent, fifthIndOff, registrations4Off, [...allItems, fifthIndOff], mockQuotas);
assert(!res1b.allowed, '4 Ind Offstage -> 5th Ind Offstage is BLOCKED', res1b.reason);

// Test 2: Student has 4 Ind Offstage + 1 Group Offstage (AF087). Total events = 5, Ind Off = 4, Grp = 1.
const registrationsWithGroup = [
  ...registrations4Off,
  { id: 'reg-87', item_id: 87, college_affl_no: 76, chest_no: 'ST-20905', item: groupOffstageItem }
];
const stats2 = calculateStudentEvents(mockStudent, registrationsWithGroup, allItems);
assert(stats2.offstageCount === 4, 'Individual offstageCount is 4 (group offstage not counted as ind offstage)', `got ${stats2.offstageCount}`);
assert(stats2.groupCount === 1, 'groupCount is 1', `got ${stats2.groupCount}`);
assert(stats2.individualCount === 4, 'individualCount is 4', `got ${stats2.individualCount}`);

// Test 3: Group limit enforcement (Aliya group_max = 4)
const fourGroupRegs = [
  { id: 'r1', item_id: 1, college_affl_no: 76, chest_no: 'ST-20905', item: { item_id: 1, point_type: 'group', mode: 'onstage', phase: 'Aliya' } },
  { id: 'r2', item_id: 2, college_affl_no: 76, chest_no: 'ST-20905', item: { item_id: 2, point_type: 'group', mode: 'offstage', phase: 'Aliya' } },
  { id: 'r3', item_id: 3, college_affl_no: 76, chest_no: 'ST-20905', item: { item_id: 3, point_type: 'group', mode: 'onstage', phase: 'Aliya' } },
  { id: 'r4', item_id: 4, college_affl_no: 76, chest_no: 'ST-20905', item: { item_id: 4, point_type: 'group', mode: 'offstage', phase: 'Aliya' } }
];
const res3 = checkStudentQuota(mockStudent, groupOffstageItem, fourGroupRegs, allItems, mockQuotas);
assert(!res3.allowed && res3.reason.includes('Exceeds max group limit'), '5th Group event is BLOCKED by group_max (4/4)', res3.reason);

// Test 4: Rule 17 General category events limit (max 2)
const twoGeneralRegs = [
  { id: 'g1', item_id: 201, college_affl_no: 76, chest_no: 'ST-20905', item: generalIndItem1 },
  { id: 'g2', item_id: 202, college_affl_no: 76, chest_no: 'ST-20905', item: generalIndItem2 }
];
const res4 = checkStudentQuota(mockStudent, generalIndItem3, twoGeneralRegs, allItems, mockQuotas);
assert(!res4.allowed && res4.reason.includes('General category limit'), '3rd General event is BLOCKED by Rule 17 (2/2)', res4.reason);

// Test 5: Category matching for General events
assert(isCategoryMatching('Aliya', 'General'), 'Aliya matches General');
assert(isCategoryMatching('Thamheediyya', 'General'), 'Thamheediyya matches General');
assert(!isCategoryMatching('Foundation', 'General'), 'Foundation DOES NOT match General');

console.log('\n=============================================');
if (failed) {
  console.error('❌ Some tests FAILED.');
  process.exit(1);
} else {
  console.log('🎉 ALL student quota verification unit tests PASSED successfully!');
}
