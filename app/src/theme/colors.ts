/**
 * 配色
 *
 * 象牙(ivory) ＋ 黒檀(ebony) ＋ 真鍮(brass) に、ティールを1点差し。
 * 値は試作から移植したうえで、コントラストがAA（4.5:1）に届くよう調整ずみ
 * （choritsu-note.html の 2026-08-29 の修正と同じ値）。
 *
 * 状態色は「地・点・枠」用と「文字」用で分ける。淡い地に鮮やかな色の文字を
 * 置くと 2.7:1 程度にしかならないため、文字には ink 側を使う。
 */

export type Palette = {
  ground: string; surface: string; surface2: string;
  ink: string; ink2: string; ink3: string;
  line: string; lineStrong: string;
  accent: string; accentInk: string; accentSoft: string; onAccent: string;
  brass: string; brassInk: string; brassSoft: string;
  overdue: string; overdueInk: string; overdueSoft: string;
  next: string; nextInk: string; nextSoft: string;
  calm: string; calmInk: string; calmSoft: string;
};

export const light: Palette = {
  ground: '#F4F2EC',
  surface: '#FFFFFF',
  surface2: '#EDEAE1',
  ink: '#1E1C17',
  ink2: '#5E594F',
  ink3: '#6E695F',
  line: '#E7E2D6',
  lineStrong: '#D6CFBF',

  accent: '#0C7F74',
  accentInk: '#0A6A60',
  accentSoft: '#DBEFEB',
  onAccent: '#FFFFFF',

  brass: '#B0873A',
  brassInk: '#785C27',
  brassSoft: '#F0E7D2',

  overdue: '#C6503A',
  overdueInk: '#A34230',
  overdueSoft: '#F6E2DB',

  next: '#3E77AC',
  nextInk: '#356394',
  nextSoft: '#E3ECF4',

  calm: '#6E7A70',
  calmInk: '#5B655D',
  calmSoft: '#E7EAE4',
};

export const dark: Palette = {
  ground: '#12110D',
  surface: '#1B1A15',
  surface2: '#25231C',
  ink: '#F2EFE6',
  ink2: '#B0A999',
  ink3: '#948B78',
  line: '#2E2B22',
  lineStrong: '#3C3830',

  accent: '#2CC2B0',
  accentInk: '#63D8C7',
  accentSoft: '#0F302D',
  onAccent: '#04231F',

  brass: '#D9B063',
  brassInk: '#D9B063',
  brassSoft: '#2E2612',

  overdue: '#EC8067',
  overdueInk: '#EC8067',
  overdueSoft: '#37231C',

  next: '#82B0DC',
  nextInk: '#82B0DC',
  nextSoft: '#19273A',

  calm: '#9DA99B',
  calmInk: '#9DA99B',
  calmSoft: '#20241D',
};


/** 高齢の利用者を想定しているため、タップ領域はここを下限にする */
export const MIN_TAP = 44;
