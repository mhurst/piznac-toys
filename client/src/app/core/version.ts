export interface UpdateNote {
  date: string;
  note: string;
  details?: string[];
}

export const APP_VERSION = 'v0.2.0';

export const UPDATE_NOTES: UpdateNote[] = [
  {
    date: '03-11-2026',
    note: 'Public Members page added!',
    details: [
      'Browse all members with avatar, bio, and figure counts',
      'Search/filter members by name',
      'Click any member to view their profile and collection',
    ],
  },
];
