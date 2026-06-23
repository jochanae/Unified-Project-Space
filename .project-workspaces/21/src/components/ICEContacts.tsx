import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Trash2, Phone, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ICEContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  notifyOnCrisis: boolean;
}

interface ICEContactsProps {
  userId: string | undefined;
}

const RELATIONSHIPS = ['Parent', 'Partner', 'Sibling', 'Friend', 'Therapist', 'Other'];
const MAX_CONTACTS = 3;

function formatPhoneDisplay(digits: string) {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function ICEContacts({ userId }: ICEContactsProps) {
  const [contacts, setContacts] = useState<ICEContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelationship, setNewRelationship] = useState('Parent');

  useEffect(() => {
    if (!userId) return;
    loadContacts();
  }, [userId]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ice_contacts')
        .select('id, name, phone_number_encrypted, relationship, notify_on_crisis')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setContacts(
        (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: '', // Encrypted — we show masked
          relationship: c.relationship,
          notifyOnCrisis: c.notify_on_crisis,
        }))
      );
    } catch {
      // Silent fail on load
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!userId || !newName.trim() || newPhone.length !== 10) {
      toast.error('Please enter a name and valid 10-digit phone number');
      return;
    }
    if (contacts.length >= MAX_CONTACTS) {
      toast.error(`Maximum ${MAX_CONTACTS} emergency contacts allowed`);
      return;
    }

    setSaving(true);
    try {
      const fullPhone = `+1${newPhone}`;
      const { error } = await supabase.from('ice_contacts').insert({
        user_id: userId,
        name: newName.trim(),
        phone_number: fullPhone,
        relationship: newRelationship,
        notify_on_crisis: true,
      });

      if (error) throw error;

      toast.success('Emergency contact added');
      setNewName('');
      setNewPhone('');
      setNewRelationship('Parent');
      setShowAdd(false);
      await loadContacts();
    } catch (e: any) {
      console.error('[ICEContacts] Save failed:', e);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('ice_contacts').delete().eq('id', id);
      if (error) throw error;
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contact removed');
    } catch {
      toast.error('Failed to remove contact');
    }
  };

  const handleToggleCrisis = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('ice_contacts')
        .update({ notify_on_crisis: !current })
        .eq('id', id);
      if (error) throw error;
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, notifyOnCrisis: !current } : c))
      );
    } catch {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return (
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Shield className="h-3.5 w-3.5" /> Emergency Contacts
        </h3>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Shield className="h-3.5 w-3.5" /> Emergency Contacts (ICE)
      </h3>
      <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          If our system detects you may be in crisis, we can send a brief, caring message to your trusted contacts via SMS.
        </p>

        {/* Existing contacts */}
        {contacts.map((contact, i) => (
          <div
            key={contact.id}
            className={`flex items-center justify-between py-3 ${i > 0 ? 'border-t border-border/30' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Phone className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {contact.name}
                  <span className="ml-1.5 text-xs text-muted-foreground">({contact.relationship})</span>
                </p>
                <p className="text-xs text-muted-foreground">Phone on file · encrypted</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleToggleCrisis(contact.id, contact.notifyOnCrisis)}
                className={`relative h-7 w-12 rounded-full transition-colors ${contact.notifyOnCrisis ? 'bg-primary' : 'bg-muted'}`}
                title={contact.notifyOnCrisis ? 'Crisis alerts on' : 'Crisis alerts off'}
              >
                <motion.div
                  animate={{ x: contact.notifyOnCrisis ? 22 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm"
                />
              </button>
              <button
                onClick={() => handleDelete(contact.id)}
                className="rounded-full p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="border-t border-border/30 pt-3 space-y-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contact name"
                  className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-muted-foreground">
                    +1
                  </div>
                  <input
                    value={formatPhoneDisplay(newPhone)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setNewPhone(digits);
                    }}
                    placeholder="(555) 123-4567"
                    className="flex-1 rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <select
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={saving || !newName.trim() || newPhone.length !== 10}
                    className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add button */}
        {!showAdd && contacts.length < MAX_CONTACTS && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2.5 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add emergency contact
          </button>
        )}
      </div>
    </section>
  );
}
