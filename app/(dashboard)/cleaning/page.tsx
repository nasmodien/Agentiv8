'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles, Users, ListChecks, DollarSign, Plus, RefreshCw,
  CheckCircle, Clock, AlertTriangle, X, Check,
  Trash2, Phone, Mail, Edit2, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'tasks' | 'cleaners' | 'checklists' | 'pay';

interface Property { id: string; name: string; unitNumber: string | null }
interface Cleaner {
  id: string; name: string; email: string | null; phone: string | null;
  payRate: number | null; notes: string | null; active: boolean;
  properties: { property: Property }[];
  tasks: { id: string }[];
}
interface ChecklistItem { id: string; label: string; done: boolean; order: number }
interface Task {
  id: string;
  propertyId: string;
  cleanerId: string | null;
  scheduledAt: string;
  completedAt: string | null;
  status: string;
  priority: string;
  notes: string | null;
  payAmount: number | null;
  property: Property;
  cleaner: { id: string; name: string; phone: string | null } | null;
  booking: { id: string; guestName: string; checkIn: string; checkOut: string } | null;
  checklistItems: ChecklistItem[];
}
interface ChecklistTemplate {
  id: string; name: string; propertyId: string | null;
  items: { id: string; label: string; order: number }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING:     { label: 'Pending',     color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',  icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',    icon: RefreshCw },
  COMPLETED:   { label: 'Completed',   color: 'text-green-600',  bg: 'bg-green-50 border-green-200',  icon: CheckCircle },
  VERIFIED:    { label: 'Verified',    color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', icon: Check },
  CANCELLED:   { label: 'Cancelled',   color: 'text-gray-400',   bg: 'bg-gray-50 border-gray-200',    icon: X },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', cfg.bg, cfg.color)}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'URGENT') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
      <AlertTriangle size={9} /> Urgent
    </span>
  );
  return null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}
// ─── TASK CARD ─────────────────────────────────────────────────────────────
function TaskCard({
  task, onStatusChange, onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = task.checklistItems.filter(i => i.done).length;
  const total = task.checklistItems.length;

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 transition-shadow hover:shadow-md',
      task.priority === 'URGENT' ? 'border-red-200' : 'border-gray-100'
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-navy truncate">
              {task.property.unitNumber ?? task.property.name}
            </span>
            <PriorityBadge priority={task.priority} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar size={11} />{fmtDate(task.scheduledAt)}</span>
            {task.cleaner && <span className="flex items-center gap-1"><Users size={11} />{task.cleaner.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={task.status} />
          <button onClick={() => onDelete(task.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Quick status buttons */}
      <div className="flex gap-1.5 flex-wrap mt-2">
        {Object.keys(STATUS_CONFIG).filter(s => s !== task.status && s !== 'CANCELLED').map(s => (
          <button
            key={s}
            onClick={() => onStatusChange(task.id, s)}
            className="px-2 py-0.5 text-[10px] font-medium border border-gray-200 rounded-full text-gray-500 hover:bg-gray-50 transition-colors"
          >
            → {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Checklist progress */}
      {total > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Checklist</span>
            <span>{done}/{total}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-blue mt-1 hover:underline">
            {expanded ? 'Hide' : 'Show'} checklist
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {task.checklistItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className={cn('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0', item.done ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
                    {item.done && <Check size={10} className="text-white" />}
                  </div>
                  <span className={item.done ? 'line-through text-gray-400' : ''}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {task.notes && <p className="text-[10px] text-gray-400 mt-2 italic">{task.notes}</p>}
      {task.payAmount && (
        <p className="text-[10px] font-medium text-green-600 mt-1">Pay: ZAR {task.payAmount.toLocaleString()}</p>
      )}
    </div>
  );
}

// ─── NEW TASK MODAL ─────────────────────────────────────────────────────────
function NewTaskModal({
  properties, cleaners, templates, onClose, onSave,
}: {
  properties: Property[];
  cleaners: Cleaner[];
  templates: ChecklistTemplate[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [propertyId, setPropertyId] = useState('');
  const [cleanerId, setCleanerId] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(); d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [priority, setPriority] = useState('NORMAL');
  const [notes, setNotes] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedTemplate = templates.find(t => t.id === templateId);
  const checklistItems = selectedTemplate?.items.map(i => i.label) ?? [];

  const handleSave = async () => {
    if (!propertyId || !scheduledAt) return;
    setSaving(true);
    await onSave({ propertyId, cleanerId: cleanerId || null, scheduledAt, priority, notes, payAmount: payAmount || null, checklistItems });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-navy">New Cleaning Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Property *</label>
            <select value={propertyId} onChange={e => setPropertyId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20">
              <option value="">Select property</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.unitNumber ?? p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Scheduled Date & Time *</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Assign Cleaner</label>
            <select value={cleanerId} onChange={e => setCleanerId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20">
              <option value="">Unassigned</option>
              {cleaners.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20">
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Pay Amount (ZAR)</label>
              <input type="number" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20" />
            </div>
          </div>
          {templates.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Checklist Template</label>
              <select value={templateId} onChange={e => setTemplateId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20">
                <option value="">No checklist</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.items.length} items)</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={!propertyId || !scheduledAt || saving}
            className="flex-1 px-4 py-2 bg-navy text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CLEANER MODAL ──────────────────────────────────────────────────────────
function CleanerModal({
  cleaner, properties, onClose, onSave,
}: {
  cleaner: Cleaner | null;
  properties: Property[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(cleaner?.name ?? '');
  const [email, setEmail] = useState(cleaner?.email ?? '');
  const [phone, setPhone] = useState(cleaner?.phone ?? '');
  const [payRate, setPayRate] = useState(String(cleaner?.payRate ?? ''));
  const [notes, setNotes] = useState(cleaner?.notes ?? '');
  const [selectedProps, setSelectedProps] = useState<string[]>(cleaner?.properties.map(p => p.property.id) ?? []);
  const [saving, setSaving] = useState(false);

  const toggleProp = (id: string) => setSelectedProps(prev =>
    prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
  );

  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    await onSave({ id: cleaner?.id, name, email, phone, payRate: payRate || null, notes, propertyIds: selectedProps });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-navy">{cleaner ? 'Edit Cleaner' : 'Add Cleaner'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Full Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Pay Rate (ZAR/clean)</label>
              <input type="number" value={payRate} onChange={e => setPayRate(e.target.value)} placeholder="500"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@email.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20" />
          </div>
          {properties.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Assigned Properties</label>
              <div className="border border-gray-200 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                {properties.map(p => (
                  <button key={p.id} onClick={() => toggleProp(p.id)}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 text-left">
                    <div className={cn('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                      selectedProps.includes(p.id) ? 'bg-blue border-blue' : 'border-gray-300')}>
                      {selectedProps.includes(p.id) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-xs text-navy">{p.unitNumber ?? p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this cleaner..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={!name || saving}
            className="flex-1 px-4 py-2 bg-navy text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {cleaner ? 'Save Changes' : 'Add Cleaner'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CHECKLIST MODAL ────────────────────────────────────────────────────────
function ChecklistModal({
  template, onClose, onSave,
}: {
  template: ChecklistTemplate | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [items, setItems] = useState<string[]>(template?.items.map(i => i.label) ?? ['']);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems(prev => [...prev, '']);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, val: string) => setItems(prev => prev.map((item, idx) => idx === i ? val : item));

  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    const filteredItems = items.filter(i => i.trim());
    await onSave({ id: template?.id, name, items: filteredItems });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-navy">{template ? 'Edit Checklist' : 'New Checklist Template'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Template Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Clean, Deep Clean"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Checklist Items</label>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}.</span>
                  <input type="text" value={item} onChange={e => updateItem(i, e.target.value)}
                    placeholder={`Item ${i + 1}`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue/20" />
                  <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-blue hover:underline mt-1">
                <Plus size={12} /> Add item
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={!name || saving}
            className="flex-1 px-4 py-2 bg-navy text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {template ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
function CleaningPageContent() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') ?? 'tasks') as Tab;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewCleaner, setShowNewCleaner] = useState(false);
  const [editCleaner, setEditCleaner] = useState<Cleaner | null>(null);
  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [editChecklist, setEditChecklist] = useState<ChecklistTemplate | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, cl, p] = await Promise.all([
        fetch('/api/cleaning/tasks?orgId=default').then(r => r.json()),
        fetch('/api/cleaning/cleaners?orgId=default').then(r => r.json()),
        fetch('/api/cleaning/checklists?orgId=default').then(r => r.json()),
        fetch('/api/properties?orgId=default').then(r => r.json()),
      ]);
      setTasks(t.tasks ?? []);
      setCleaners(c.cleaners ?? []);
      setTemplates(cl.templates ?? []);
      setProperties(p.properties ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateTaskStatus = async (id: string, status: string) => {
    await fetch(`/api/cleaning/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/cleaning/tasks/${id}`, { method: 'DELETE' });
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const createTask = async (data: Record<string, unknown>) => {
    const res = await fetch('/api/cleaning/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.task) { setTasks(prev => [json.task, ...prev]); setShowNewTask(false); }
  };

  const saveCleaner = async (data: Record<string, unknown>) => {
    const method = data.id ? 'PUT' : 'POST';
    const url = '/api/cleaning/cleaners';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, orgId: 'default' }) });
    const json = await res.json();
    if (json.cleaner) {
      setCleaners(prev => data.id ? prev.map(c => c.id === data.id ? json.cleaner : c) : [json.cleaner, ...prev]);
      setShowNewCleaner(false);
      setEditCleaner(null);
    }
  };

  const deleteCleaner = async (id: string) => {
    if (!confirm('Remove this cleaner?')) return;
    await fetch(`/api/cleaning/cleaners?id=${id}`, { method: 'DELETE' });
    setCleaners(prev => prev.filter(c => c.id !== id));
  };

  const saveChecklist = async (data: Record<string, unknown>) => {
    const method = data.id ? 'PUT' : 'POST';
    const res = await fetch('/api/cleaning/checklists', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, orgId: 'default' }),
    });
    const json = await res.json();
    if (json.template) {
      setTemplates(prev => data.id ? prev.map(t => t.id === data.id ? json.template : t) : [json.template, ...prev]);
      setShowNewChecklist(false);
      setEditChecklist(null);
    }
  };

  const deleteChecklist = async (id: string) => {
    if (!confirm('Delete this checklist template?')) return;
    await fetch(`/api/cleaning/checklists?id=${id}`, { method: 'DELETE' });
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // Stats
  const pending = tasks.filter(t => t.status === 'PENDING').length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const completed = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VERIFIED').length;
  const urgent = tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED' && t.status !== 'VERIFIED' && t.status !== 'CANCELLED').length;

  const filteredTasks = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);

  // Pay summary
  const payByCleaners = cleaners.map(c => {
    const cleanerTasks = tasks.filter(t => t.cleanerId === c.id && (t.status === 'COMPLETED' || t.status === 'VERIFIED'));
    const totalPay = cleanerTasks.reduce((sum, t) => sum + (t.payAmount ?? c.payRate ?? 0), 0);
    return { ...c, completedTasks: cleanerTasks.length, totalPay };
  }).filter(c => c.completedTasks > 0 || c.active);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Cleaning</h1>
            <p className="text-xs text-gray-500">{tasks.length} tasks · {cleaners.length} cleaners</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewTask(true)}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-xl hover:opacity-90"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: pending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'In Progress', value: inProgress, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: completed, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Urgent', value: urgent, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4', s.bg)} style={{ boxShadow: 'var(--shadow)' }}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading && <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw size={18} className="animate-spin mr-2" /> Loading...</div>}

      {/* ── TASKS TAB ── */}
      {!loading && tab === 'tasks' && (
        <div>
          {/* Status filter */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  statusFilter === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
                {s !== 'all' && <span className="ml-1 opacity-60">({tasks.filter(t => t.status === s).length})</span>}
              </button>
            ))}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tasks found.</p>
              <button onClick={() => setShowNewTask(true)} className="mt-3 text-blue text-sm hover:underline">Create your first task</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredTasks.map(task => (
                <TaskCard key={task.id} task={task} onStatusChange={updateTaskStatus} onDelete={deleteTask} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CLEANERS TAB ── */}
      {!loading && tab === 'cleaners' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowNewCleaner(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:opacity-90">
              <Plus size={13} /> Add Cleaner
            </button>
          </div>
          {cleaners.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No cleaners yet.</p>
              <button onClick={() => setShowNewCleaner(true)} className="mt-3 text-blue text-sm hover:underline">Add your first cleaner</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {cleaners.map(c => (
                <div key={c.id} className={cn('bg-white rounded-xl border p-4', !c.active && 'opacity-50')} style={{ boxShadow: 'var(--shadow)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">{c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy">{c.name}</p>
                        {c.payRate && <p className="text-xs text-green-600">ZAR {c.payRate}/clean</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditCleaner(c)} className="p-1.5 text-gray-400 hover:text-blue rounded-lg hover:bg-gray-50">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteCleaner(c.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-50">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    {c.phone && <p className="flex items-center gap-1.5"><Phone size={11} />{c.phone}</p>}
                    {c.email && <p className="flex items-center gap-1.5"><Mail size={11} />{c.email}</p>}
                    {c.tasks.length > 0 && (
                      <p className="flex items-center gap-1.5"><Clock size={11} />{c.tasks.length} active task{c.tasks.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  {c.properties.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-1.5">Assigned properties</p>
                      <div className="flex flex-wrap gap-1">
                        {c.properties.map(cp => (
                          <span key={cp.property.id} className="px-1.5 py-0.5 bg-blue/10 text-blue text-[10px] rounded font-medium">
                            {cp.property.unitNumber ?? cp.property.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CHECKLISTS TAB ── */}
      {!loading && tab === 'checklists' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowNewChecklist(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:opacity-90">
              <Plus size={13} /> New Template
            </button>
          </div>
          {templates.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ListChecks size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No checklist templates yet.</p>
              <button onClick={() => setShowNewChecklist(true)} className="mt-3 text-blue text-sm hover:underline">Create your first template</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {templates.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4" style={{ boxShadow: 'var(--shadow)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-navy">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.items.length} items</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditChecklist(t)} className="p-1.5 text-gray-400 hover:text-blue rounded-lg hover:bg-gray-50">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteChecklist(t.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-50">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {t.items.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-3.5 h-3.5 rounded border border-gray-300 flex-shrink-0" />
                        {item.label}
                      </div>
                    ))}
                    {t.items.length > 5 && (
                      <p className="text-[10px] text-gray-400">+{t.items.length - 5} more items</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PAY TAB ── */}
      {!loading && tab === 'pay' && (
        <div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-navy">Cleaner Pay Summary</h2>
              <p className="text-xs text-gray-400">Based on completed & verified tasks</p>
            </div>
            {payByCleaners.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No cleaner data yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {payByCleaners.map(c => (
                  <div key={c.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.completedTasks} tasks completed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-green-600">ZAR {Math.round(c.totalPay).toLocaleString()}</p>
                      {c.payRate && <p className="text-[10px] text-gray-400">@ ZAR {c.payRate}/clean</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {payByCleaners.some(c => c.totalPay > 0) && (
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
                <span className="text-sm font-semibold text-navy">Total Owed</span>
                <span className="text-base font-bold text-navy">
                  ZAR {Math.round(payByCleaners.reduce((s, c) => s + c.totalPay, 0)).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showNewTask && (
        <NewTaskModal properties={properties} cleaners={cleaners} templates={templates} onClose={() => setShowNewTask(false)} onSave={createTask} />
      )}
      {(showNewCleaner || editCleaner) && (
        <CleanerModal cleaner={editCleaner} properties={properties} onClose={() => { setShowNewCleaner(false); setEditCleaner(null); }} onSave={saveCleaner} />
      )}
      {(showNewChecklist || editChecklist) && (
        <ChecklistModal template={editChecklist} onClose={() => { setShowNewChecklist(false); setEditChecklist(null); }} onSave={saveChecklist} />
      )}
    </div>
  );
}

export default function CleaningPage() {
  return (
    <Suspense>
      <CleaningPageContent />
    </Suspense>
  );
}
