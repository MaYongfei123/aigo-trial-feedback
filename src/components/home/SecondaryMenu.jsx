import { FileArchive, FolderKanban, History } from 'lucide-react';

export default function SecondaryMenu({ onNavigate }) {
  return (
    <section className="secondaryMenu" aria-label="次级功能">
      <button type="button" onClick={() => onNavigate('/history')}>
        <History size={18} />
        历史测评记录
      </button>
      <button type="button" onClick={() => onNavigate('/library')}>
        <FolderKanban size={18} />
        项目资料库
      </button>
      <button type="button" onClick={() => onNavigate('/history')}>
        <FileArchive size={18} />
        导出记录
      </button>
    </section>
  );
}
