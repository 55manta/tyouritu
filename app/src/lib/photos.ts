/**
 * 作業の写真。
 *
 * 端末の中のファイルとして持ち、記録にはファイル名だけを入れる。
 * 画像そのものを台帳に入れない理由は2つ。
 *  ・Firestore は1件1MiBまで。写真を入れると一発で当たる
 *  ・台帳を1軒開くたびに写真まで運ぶことになる
 *
 * 長辺1280pxに縮めてから保存する。お宅の中が写るものなので、
 * 必要以上に大きく持たない。
 *
 * いまのところ写真はクラウドへ送らない（Cloud Storage は有料プランが要る）。
 * つまり端末を無くすと写真は戻らない。設定画面にもそう書いてある。
 */

import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** 長辺の上限。現場の記録として見るには十分で、容量は抑えられる */
export const MAX_EDGE = 1280;

function dir(): Directory {
  return new Directory(Paths.document, 'photos');
}

function fileOf(name: string): File {
  return new File(dir(), name);
}

/** 保存してあるファイル名から、表示に使えるURIを作る */
export function photoUri(name: string | null): string | null {
  if (!name) return null;
  try {
    return fileOf(name).uri;
  } catch {
    return null;
  }
}

export type PickResult =
  | { ok: true; name: string }
  | { ok: false; canceled: true }
  | { ok: false; reason: string };

/**
 * 撮る（または選ぶ）→ 縮める → 端末に保存 → ファイル名を返す。
 * 権限を断られた場合も、例外ではなく戻り値で返す。
 */
export async function capturePhoto(from: 'camera' | 'library'): Promise<PickResult> {
  try {
    const perm = from === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return {
        ok: false,
        reason: from === 'camera'
          ? 'カメラを使う許可がありません。端末の設定からお許しください。'
          : '写真を見る許可がありません。端末の設定からお許しください。',
      };
    }

    const res = from === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });

    if (res.canceled || !res.assets?.length) return { ok: false, canceled: true };

    const src = res.assets[0];
    const long = Math.max(src.width || 0, src.height || 0);
    const scale = long > MAX_EDGE ? MAX_EDGE / long : 1;

    const ctx = ImageManipulator.manipulate(src.uri);
    if (scale < 1) {
      ctx.resize({
        width: Math.round((src.width || MAX_EDGE) * scale),
        height: Math.round((src.height || MAX_EDGE) * scale),
      });
    }
    const rendered = await ctx.renderAsync();
    const out = await rendered.saveAsync({ compress: 0.72, format: SaveFormat.JPEG });

    const d = dir();
    if (!d.exists) d.create({ intermediates: true });

    const name = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.jpg`;
    await new File(out.uri).move(new File(d, name));
    return { ok: true, name };
  } catch {
    return { ok: false, reason: '写真を取り込めませんでした。もう一度お試しください。' };
  }
}

/** 記録から外した写真は、端末からも消す。残しておく理由がない */
export function deletePhoto(name: string | null): void {
  if (!name) return;
  try {
    const f = fileOf(name);
    if (f.exists) f.delete();
  } catch {
    // 消せなくても実害は無い
  }
}

/** ファイルが実際にあるか。機種変更で台帳だけ戻ったときは無いことがある */
export function photoExists(name: string | null): boolean {
  if (!name) return false;
  try {
    return fileOf(name).exists;
  } catch {
    return false;
  }
}
