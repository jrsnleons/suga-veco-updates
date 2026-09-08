import { extractPostDate } from '../text-parser';

export const testCases = [
  {
    name: 'Header posted date with explicit future maintenance date',
    text: 'VISAYAN ELECTRIC ADVISORY\n(Posted on September 8, 2026)\nScheduled maintenance on September 10, 2026 from 8:00 AM to 5:00 PM in Banilad, Cebu City.',
    expectedDate: '2026-09-10',
    expectedLabel: 'Tomorrow (Sep 10)'
  },
  {
    name: 'VECO UPDATE #14 with schedule tomorrow',
    text: 'VECO UPDATE #14 (September 8, 2026)\nSchedule for tomorrow (Sep 10) in Talamban, Cebu City: 9:00 AM - 1:00 PM',
    expectedDate: '2026-09-10',
    expectedLabel: 'Tomorrow (Sep 10)'
  },
  {
    name: 'Explicit Date keyword field',
    text: 'EMERGENCY REPAIR\nDate: September 11, 2026\nTime: 1:00 PM - 5:00 PM\nArea: Lahug, Cebu City',
    expectedDate: '2026-09-11',
    expectedLabel: 'Friday (Sep 11)'
  },
  {
    name: 'Cebuano keyword Petsa and time',
    text: 'PAHIBALO SA POWER INTERRUPTION\nPetsa: Setyembre 12, 2026\nOras: 8:00 AM - 5:00 PM\nLugar: Bulacao, Talisay City',
    expectedDate: '2026-09-12',
    expectedLabel: 'Saturday (Sep 12)'
  },
  {
    name: 'Multi-day date range containing today',
    text: 'Rotational Load Shedding daily, Sep 7 to Sep 13, 2026 from 6:00 PM to 9:00 PM across Mandaue City.',
    expectedDate: '2026-09-09',
    expectedLabel: 'Today (Sep 9)'
  },
  {
    name: 'Future multi-day date range',
    text: 'Scheduled feeder upgrade from Sep 11 to Sep 14, 2026 in Mabolo.',
    expectedDate: '2026-09-11',
    expectedLabel: 'Friday (Sep 11)'
  },
  {
    name: 'Numeric date format MM/DD/YYYY',
    text: 'Advisory: Interruption set for 09/12/2026 between 10:00 AM and 2:00 PM in Guadalupe.',
    expectedDate: '2026-09-12',
    expectedLabel: 'Saturday (Sep 12)'
  },
  {
    name: 'Relative Cebuano ugma',
    text: 'Advisory: Adunay maintenance ugma sa Basak, San Nicolas.',
    expectedDate: '2026-09-10',
    expectedLabel: 'Tomorrow (Sep 10)'
  },
  {
    name: 'Relative English today',
    text: 'Emergency interruption today in Mabolo, Cebu City due to damaged pole.',
    expectedDate: '2026-09-09',
    expectedLabel: 'Today (Sep 9)'
  },
  {
    name: 'Weekday name matching on Friday',
    text: 'Scheduled interruption on Friday in Labangon, Cebu City.',
    expectedDate: '2026-09-11',
    expectedLabel: 'Friday (Sep 11)'
  }
];
