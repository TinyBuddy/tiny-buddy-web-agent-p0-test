/**
 * 歌曲信息接口
 */
export interface Song {
  id: string;
  name: string;
  url: string;
  description: string;
}

/**
 * 歌曲列表响应接口
 */
export interface SongsResponse {
  songs: Song[];
}
