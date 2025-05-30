import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="w-full py-4 px-6 bg-white dark:bg-gray-900 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-gray-800 dark:text-white">
          Tiny Buddy
        </Link>
        
        <div className="flex space-x-4">
          <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
            首页
          </Link>
          <Link href="/chat" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
            AI 聊天
          </Link>
          <Link href="/transcribe" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
            语音转文本
          </Link>
          <Link href="/tts" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
            文本转语音
          </Link>
          <Link href="/about" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
            关于
          </Link>
        </div>
      </div>
    </nav>
  );
}
