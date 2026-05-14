export type Tool = {
  id: string;
  name: string;
  description: string;
  path: string;
};

export const TOOLS: Tool[] = [
  {
    id: 'browser-info',
    name: 'ブラウザ情報',
    description: 'ブラウザから取得できる情報を一覧表示します。',
    path: '/tools/browser-info',
  },
  {
    id: 'download-speed',
    name: 'ダウンロード速度測定',
    description: '回線のダウンロード速度を計測します',
    path: '/tools/download-speed',
  },
  {
    id: 'summarize',
    name: '文章要約',
    description: 'テキストを入力するとAIが要約します。',
    path: '/tools/summarize',
  },
];
