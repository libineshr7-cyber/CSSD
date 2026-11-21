import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  FileText,
  FileImage,
  Archive,
  File,
  Lock,
  Globe,
  Download,
  Eye,
  Edit,
  Trash2,
  Upload,
  Search,
  Grid,
  List,
  X,
  Plus,
  FolderOpen,
  HardDrive,
  Shield,
  ChevronDown,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type FileType = 'pdf' | 'word' | 'image' | 'zip' | 'other';
type Category =
  | 'Agreement'
  | 'Invoice'
  | 'Quotation'
  | 'Design'
  | 'Contract'
  | 'Report'
  | 'Other';

interface Document {
  id: string;
  name: string;
  description: string;
  category: Category;
  fileType: FileType;
  size: string;
  sizeBytes: number;
  uploadDate: string;
  isPrivate: boolean;
  clientName?: string;
  projectName?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DOCUMENTS: Document[] = [
  {
    id: '1',
    name: 'Service_Agreement_2024.pdf',
    description: 'Annual service agreement for security monitoring services.',
    category: 'Agreement',
    fileType: 'pdf',
    size: '1.2 MB',
    sizeBytes: 1258291,
    uploadDate: '2024-01-15',
    isPrivate: true,
    clientName: 'Atlantic Retail Group',
    projectName: 'ARG Security Monitoring',
  },
  {
    id: '2',
    name: 'Invoice_INV-2024-0042.pdf',
    description: 'Invoice for CCTV installation at Harbour Point.',
    category: 'Invoice',
    fileType: 'pdf',
    size: '342 KB',
    sizeBytes: 350208,
    uploadDate: '2024-02-03',
    isPrivate: false,
    clientName: 'Harbour Point Mall',
    projectName: 'CCTV Upgrade Phase 1',
  },
  {
    id: '3',
    name: 'Site_Layout_HarbourPoint.png',
    description: 'Annotated site layout showing camera placement zones.',
    category: 'Design',
    fileType: 'image',
    size: '4.7 MB',
    sizeBytes: 4927488,
    uploadDate: '2024-02-10',
    isPrivate: true,
    clientName: 'Harbour Point Mall',
    projectName: 'CCTV Upgrade Phase 1',
  },
  {
    id: '4',
    name: 'Security_Proposal_GovHQ.docx',
    description: 'Detailed quotation and scope for government HQ perimeter.',
    category: 'Quotation',
    fileType: 'word',
    size: '890 KB',
    sizeBytes: 911360,
    uploadDate: '2024-03-01',
    isPrivate: true,
    clientName: 'Cape Town Municipality',
    projectName: 'HQ Perimeter Security',
  },
  {
    id: '5',
    name: 'NDA_CapeSecure_Client.pdf',
    description: 'Non-disclosure agreement template for new clients.',
    category: 'Contract',
    fileType: 'pdf',
    size: '210 KB',
    sizeBytes: 215040,
    uploadDate: '2024-03-14',
    isPrivate: true,
  },
  {
    id: '6',
    name: 'Monthly_Security_Report_Feb2024.docx',
    description: 'Monthly incident and performance report for February 2024.',
    category: 'Report',
    fileType: 'word',
    size: '1.8 MB',
    sizeBytes: 1887437,
    uploadDate: '2024-03-05',
    isPrivate: false,
    clientName: 'Atlantic Retail Group',
  },
  {
    id: '7',
    name: 'Camera_Specs_Hikvision.zip',
    description: 'Technical datasheets and firmware bundle for Hikvision cams.',
    category: 'Other',
    fileType: 'zip',
    size: '23.4 MB',
    sizeBytes: 24539136,
    uploadDate: '2024-01-28',
    isPrivate: false,
  },
  {
    id: '8',
    name: 'Site_Photos_GovHQ.zip',
    description: 'Site survey photos from the government HQ walkthrough.',
    category: 'Design',
    fileType: 'zip',
    size: '67.1 MB',
    sizeBytes: 70333235,
    uploadDate: '2024-02-20',
    isPrivate: true,
    clientName: 'Cape Town Municipality',
    projectName: 'HQ Perimeter Security',
  },
  {
    id: '9',
    name: 'Invoice_INV-2024-0051.pdf',
    description: 'Invoice for access control hardware supply.',
    category: 'Invoice',
    fileType: 'pdf',
    size: '298 KB',
    sizeBytes: 305152,
    uploadDate: '2024-03-20',
    isPrivate: false,
    clientName: 'Cape Town Municipality',
  },
  {
    id: '10',
    name: 'Server_Room_Layout.png',
    description: 'Rack layout and cable routing diagram for server room.',
    category: 'Design',
    fileType: 'image',
    size: '3.2 MB',
    sizeBytes: 3354214,
    uploadDate: '2024-03-25',
    isPrivate: true,
    clientName: 'Atlantic Retail Group',
    projectName: 'ARG Security Monitoring',
  },
];

const CATEGORIES: Category[] = [
  'Agreement',
  'Invoice',
  'Quotation',
  'Design',
  'Contract',
  'Report',
  'Other',
];

const CLIENT_OPTIONS = [
  'Atlantic Retail Group',
  'Harbour Point Mall',
  'Cape Town Municipality',
];

const PROJECT_OPTIONS = [
  'ARG Security Monitoring',
  'CCTV Upgrade Phase 1',
  'HQ Perimeter Security',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getTotalBytes(docs: Document[]): string {
  const total = docs.reduce((acc, d) => acc + d.sizeBytes, 0);
  if (total < 1048576) return `${(total / 1024).toFixed(0)} KB`;
  if (total < 1073741824) return `${(total / 1048576).toFixed(1)} MB`;
  return `${(total / 1073741824).toFixed(2)} GB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── File Icon ────────────────────────────────────────────────────────────────

const FileIcon: React.FC<{ fileType: FileType; size?: number }> = ({
  fileType,
  size = 32,
}) => {
  const props = { size, strokeWidth: 1.5 };
  switch (fileType) {
    case 'pdf':
      return (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50">
          <FileText {...props} className="text-red-500" />
        </div>
      );
    case 'word':
      return (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50">
          <FileText {...props} className="text-blue-500" />
        </div>
      );
    case 'image':
      return (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-50">
          <FileImage {...props} className="text-green-500" />
        </div>
      );
    case 'zip':
      return (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100">
          <Archive {...props} className="text-gray-500" />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-50">
          <File {...props} className="text-purple-500" />
        </div>
      );
  }
};

// ─── Category Badge ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<Category, string> = {
  Agreement: 'bg-indigo-100 text-indigo-700',
  Invoice: 'bg-yellow-100 text-yellow-700',
  Quotation: 'bg-orange-100 text-orange-700',
  Design: 'bg-teal-100 text-teal-700',
  Contract: 'bg-purple-100 text-purple-700',
  Report: 'bg-blue-100 text-blue-700',
  Other: 'bg-gray-100 text-gray-600',
};

const CategoryBadge: React.FC<{ category: Category }> = ({ category }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[category]}`}
  >
    {category}
  </span>
);

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onUpload: (doc: Document) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '' as Category | '',
    client: '',
    project: '',
    isPrivate: true,
    fileType: 'pdf' as FileType,
  });
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      setForm((prev) => ({ ...prev, name: prev.name || file.name }));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setForm((prev) => ({ ...prev, name: prev.name || file.name }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) {
      toast.error('Please fill in all required fields.');
      return;
    }
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name: form.name,
      description: form.description,
      category: form.category as Category,
      fileType: form.fileType,
      size: '0 KB',
      sizeBytes: 0,
      uploadDate: new Date().toISOString().split('T')[0],
      isPrivate: form.isPrivate,
      clientName: form.client || undefined,
      projectName: form.project || undefined,
    };
    onUpload(newDoc);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Upload size={20} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Drag & Drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload size={28} className="mx-auto text-gray-400 mb-2" />
            {fileName ? (
              <p className="text-sm font-medium text-blue-600">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">
                  Drag & drop your file here
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  or click to browse — PDF, Word, Images, ZIP supported
                </p>
              </>
            )}
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* File Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Service_Agreement_2024.pdf"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the document..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Category + File Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Type
              </label>
              <select
                value={form.fileType}
                onChange={(e) => setForm({ ...form, fileType: e.target.value as FileType })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="image">Image</option>
                <option value="zip">ZIP</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
            <select
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No client</option>
              {CLIENT_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No project</option>
              {PROJECT_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              {form.isPrivate ? (
                <Lock size={18} className="text-gray-600" />
              ) : (
                <Globe size={18} className="text-green-600" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {form.isPrivate ? 'Private' : 'Public'}
                </p>
                <p className="text-xs text-gray-500">
                  {form.isPrivate
                    ? 'Only visible to your team'
                    : 'Accessible via shared link'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.isPrivate ? 'bg-gray-400' : 'bg-green-500'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.isPrivate ? 'left-1' : 'left-6'
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Upload Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Document Card (Grid) ─────────────────────────────────────────────────────

interface DocumentCardProps {
  doc: Document;
  onDelete: (id: string) => void;
  onEdit: (doc: Document) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc, onDelete, onEdit }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3 group">
    {/* Top Row */}
    <div className="flex items-start justify-between">
      <FileIcon fileType={doc.fileType} />
      <span
        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
          doc.isPrivate
            ? 'bg-gray-100 text-gray-500'
            : 'bg-green-50 text-green-600'
        }`}
      >
        {doc.isPrivate ? (
          <Lock size={11} />
        ) : (
          <Globe size={11} />
        )}
        {doc.isPrivate ? 'Private' : 'Public'}
      </span>
    </div>

    {/* Name & Description */}
    <div>
      <h3
        className="text-sm font-semibold text-gray-900 truncate"
        title={doc.name}
      >
        {doc.name}
      </h3>
      {doc.description && (
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {doc.description}
        </p>
      )}
    </div>

    {/* Badges */}
    <div className="flex flex-wrap gap-1.5">
      <CategoryBadge category={doc.category} />
      {doc.clientName && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          {doc.clientName}
        </span>
      )}
    </div>

    {/* Meta */}
    <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto">
      <span className="flex items-center gap-1">
        <HardDrive size={11} />
        {doc.size}
      </span>
      <span>{formatDate(doc.uploadDate)}</span>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-1 pt-2 border-t border-gray-50">
      <button
        onClick={() => toast.success(`Downloading "${doc.name}"…`)}
        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="Download"
      >
        <Download size={13} />
        <span>Download</span>
      </button>
      <button
        onClick={() => toast(`Viewing "${doc.name}"`, { icon: '👁️' })}
        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
        title="View"
      >
        <Eye size={13} />
        <span>View</span>
      </button>
      <button
        onClick={() => onEdit(doc)}
        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
        title="Edit"
      >
        <Edit size={13} />
        <span>Edit</span>
      </button>
      <button
        onClick={() => onDelete(doc.id)}
        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Delete"
      >
        <Trash2 size={13} />
        <span>Delete</span>
      </button>
    </div>
  </div>
);

// ─── Document Row (List) ──────────────────────────────────────────────────────

const DocumentRow: React.FC<DocumentCardProps> = ({ doc, onDelete, onEdit }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all px-5 py-4 flex items-center gap-4">
    <FileIcon fileType={doc.fileType} size={22} />

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-gray-900 truncate max-w-xs">
          {doc.name}
        </span>
        <CategoryBadge category={doc.category} />
        <span
          className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            doc.isPrivate
              ? 'bg-gray-100 text-gray-500'
              : 'bg-green-50 text-green-600'
          }`}
        >
          {doc.isPrivate ? <Lock size={10} /> : <Globe size={10} />}
          {doc.isPrivate ? 'Private' : 'Public'}
        </span>
      </div>
      {doc.clientName && (
        <p className="text-xs text-gray-400 mt-0.5">{doc.clientName}</p>
      )}
    </div>

    <div className="hidden md:flex items-center gap-6 text-xs text-gray-400 shrink-0">
      <span>{doc.size}</span>
      <span>{formatDate(doc.uploadDate)}</span>
    </div>

    <div className="flex items-center gap-1 shrink-0">
      {[
        { icon: Download, label: 'Download', color: 'blue', action: () => toast.success(`Downloading "${doc.name}"…`) },
        { icon: Eye, label: 'View', color: 'green', action: () => toast(`Viewing "${doc.name}"`, { icon: '👁️' }) },
        { icon: Edit, label: 'Edit', color: 'yellow', action: () => onEdit(doc) },
        { icon: Trash2, label: 'Delete', color: 'red', action: () => onDelete(doc.id) },
      ].map(({ icon: Icon, label, color, action }) => (
        <button
          key={label}
          onClick={action}
          title={label}
          className={`p-2 rounded-lg text-gray-400 hover:text-${color}-600 hover:bg-${color}-50 transition-colors`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'All'>('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Derived stats
  const totalDocs = documents.length;
  const privateDocs = documents.filter((d) => d.isPrivate).length;
  const publicDocs = documents.filter((d) => !d.isPrivate).length;
  const totalSize = getTotalBytes(documents);

  // Filtered docs
  const filtered = documents.filter((doc) => {
    const matchSearch =
      !search ||
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === 'All' || doc.category === categoryFilter;
    const matchClient =
      clientFilter === 'All' ||
      (doc.clientName ?? '') === clientFilter;
    return matchSearch && matchCategory && matchClient;
  });

  const handleDelete = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    toast.success(`"${doc?.name}" deleted successfully.`);
  };

  const handleUpload = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
    setShowUploadModal(false);
    toast.success(`"${doc.name}" uploaded successfully!`);
  };

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    toast(`Editing "${doc.name}" — feature coming soon!`, { icon: '✏️' });
  };

  const allClients = Array.from(
    new Set(documents.map((d) => d.clientName).filter(Boolean) as string[])
  );

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen size={26} className="text-blue-600" />
            Documents
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and share project documents, contracts, and reports.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus size={16} />
          Upload Document
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Documents"
          value={totalDocs}
          icon={<FileText size={20} className="text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Private"
          value={privateDocs}
          icon={<Lock size={20} className="text-gray-600" />}
          color="bg-gray-100"
        />
        <StatCard
          label="Public"
          value={publicDocs}
          icon={<Globe size={20} className="text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          label="Total Size"
          value={totalSize}
          icon={<HardDrive size={20} className="text-purple-600" />}
          color="bg-purple-50"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <button
            onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowClientDropdown(false); }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Shield size={14} className="text-gray-400" />
            {categoryFilter === 'All' ? 'All Categories' : categoryFilter}
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-20 min-w-40 py-1">
              {['All', ...CATEGORIES].map((c) => (
                <button
                  key={c}
                  onClick={() => { setCategoryFilter(c as Category | 'All'); setShowCategoryDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    categoryFilter === c ? 'text-blue-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {c === 'All' ? 'All Categories' : c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Client Filter */}
        <div className="relative">
          <button
            onClick={() => { setShowClientDropdown(!showClientDropdown); setShowCategoryDropdown(false); }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {clientFilter === 'All' ? 'All Clients' : clientFilter}
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {showClientDropdown && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-20 min-w-52 py-1">
              {['All', ...allClients].map((c) => (
                <button
                  key={c}
                  onClick={() => { setClientFilter(c); setShowClientDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    clientFilter === c ? 'text-blue-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {c === 'All' ? 'All Clients' : c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Grid view"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            title="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Results count */}
      {filtered.length !== documents.length && (
        <p className="text-sm text-gray-500">
          Showing {filtered.length} of {documents.length} documents
        </p>
      )}

      {/* Document Grid / List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen size={48} className="text-gray-200 mb-4" />
          <h3 className="text-gray-500 font-medium">No documents found</h3>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your filters or upload a new document.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
};

export default DocumentsPage;
