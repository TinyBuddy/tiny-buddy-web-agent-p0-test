export default function Footer() {
  return (
    <footer className="w-full py-4 px-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} Tiny Buddy. 保留所有权利。
        </p>
      </div>
    </footer>
  );
}
