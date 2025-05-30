/**
 * 音效信息接口
 */
export interface SoundEffect {
  id: string;
  name: string;
  url: string;
  description: string;
}

/**
 * 音效列表响应接口
 */
export interface SoundEffectsResponse {
  sound_effects: SoundEffect[];
}
