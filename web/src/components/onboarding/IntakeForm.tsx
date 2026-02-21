'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { REALM_COLORS, DOMAIN_COLORS, type ThematicDomain, type BioregionLookup } from '@/types';
import { assetPath } from '@/lib/constants';

const THEMATIC_DOMAINS: { value: ThematicDomain; label: string; description: string }[] = [
  { value: 'watershed-governance', label: 'Water & Watersheds', description: 'Rivers, aquifers, water rights, irrigation' },
  { value: 'ecological-restoration', label: 'Land & Ecology', description: 'Restoration, conservation, biodiversity' },
  { value: 'food-systems', label: 'Food Systems', description: 'Local food, seed saving, food sovereignty' },
  { value: 'climate-resilience', label: 'Energy & Climate', description: 'Renewables, carbon, climate adaptation' },
  { value: 'community-governance', label: 'Bioregional Governance', description: 'Community governance, policy, rights of nature' },
  { value: 'traditional-knowledge', label: 'Traditional Knowledge', description: 'Indigenous knowledge, cultural heritage' },
];

interface FormData {
  // Step 1: Community
  communityName: string;
  contactName: string;
  contactEmail: string;
  website: string;

  // Step 2: Bioregion
  bioregionCode: string;
  thematicDomain: ThematicDomain | '';
  otherDomain: string;

  // Step 3: Knowledge
  existingKnowledge: string;
  knowledgeFormat: string[];
  goals: string;

  // Step 4: Technical
  hasGithub: boolean;
  githubOrg: string;
  technicalCapacity: 'low' | 'medium' | 'high';
  hostingPreference: 'managed' | 'self-hosted';
}

const INITIAL_FORM: FormData = {
  communityName: '',
  contactName: '',
  contactEmail: '',
  website: '',
  bioregionCode: '',
  thematicDomain: '',
  otherDomain: '',
  existingKnowledge: '',
  knowledgeFormat: [],
  goals: '',
  hasGithub: false,
  githubOrg: '',
  technicalCapacity: 'medium',
  hostingPreference: 'managed',
};

const STEPS = [
  { id: 1, title: 'Community', icon: '👥' },
  { id: 2, title: 'Bioregion', icon: '🌍' },
  { id: 3, title: 'Knowledge', icon: '📚' },
  { id: 4, title: 'Technical', icon: '⚙️' },
  { id: 5, title: 'Review', icon: '✓' },
];

export default function IntakeForm({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bioregionLookup, setBioregionLookup] = useState<BioregionLookup>({});

  // Load bioregion data
  useEffect(() => {
    fetch(assetPath('/data/bioregion-lookup.json'))
      .then((r) => r.json())
      .then((data: BioregionLookup) => setBioregionLookup(data))
      .catch(console.error);
  }, []);

  // Derive options from loaded data
  const bioregionOptions = useMemo(() => {
    return Object.entries(bioregionLookup)
      .map(([code, info]) => ({
        code,
        name: info.name,
        realm: info.realm,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bioregionLookup]);

  const realms = useMemo(() => {
    return [...new Set(bioregionOptions.map((b) => b.realm))].sort();
  }, [bioregionOptions]);

  const selectedBioregion = bioregionLookup[form.bioregionCode];

  const updateForm = useCallback((updates: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleKnowledgeFormat = useCallback((format: string) => {
    setForm((prev) => ({
      ...prev,
      knowledgeFormat: prev.knowledgeFormat.includes(format)
        ? prev.knowledgeFormat.filter((f) => f !== format)
        : [...prev.knowledgeFormat, format],
    }));
  }, []);

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return form.communityName.trim() && form.contactName.trim() && form.contactEmail.includes('@');
      case 2:
        return form.bioregionCode && form.thematicDomain;
      case 3:
        return form.existingKnowledge.trim().length >= 20;
      case 4:
        return true;
      default:
        return true;
    }
  }, [step, form]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // In production, this would submit to an API or external service
    // For now, we generate a mailto link with the form data
    const subject = encodeURIComponent(`[BKC Intake] ${form.communityName}`);
    const body = encodeURIComponent(`
BIOREGIONAL KNOWLEDGE COMMONS - INTAKE FORM
============================================

COMMUNITY INFORMATION
---------------------
Community Name: ${form.communityName}
Contact Name: ${form.contactName}
Contact Email: ${form.contactEmail}
Website: ${form.website || 'N/A'}

BIOREGION & FOCUS
-----------------
Bioregion: ${form.bioregionCode} (${bioregionLookup[form.bioregionCode]?.name || 'Unknown'})
Thematic Domain: ${form.thematicDomain}${form.otherDomain ? ` (${form.otherDomain})` : ''}

KNOWLEDGE ASSETS
----------------
Existing Knowledge:
${form.existingKnowledge}

Knowledge Formats: ${form.knowledgeFormat.join(', ') || 'None specified'}

Goals:
${form.goals || 'Not specified'}

TECHNICAL READINESS
-------------------
Has GitHub: ${form.hasGithub ? 'Yes' : 'No'}
GitHub Organization: ${form.githubOrg || 'N/A'}
Technical Capacity: ${form.technicalCapacity}
Hosting Preference: ${form.hostingPreference}

---
Submitted: ${new Date().toISOString()}
    `.trim());

    // Open mailto (fallback for static site)
    window.open(`mailto:onboarding@opencivics.org?subject=${subject}&body=${body}`, '_blank');

    // Simulate submission delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const realmColor = selectedBioregion ? REALM_COLORS[selectedBioregion.realm] : '#6B7280';
  const domainColor = form.thematicDomain ? DOMAIN_COLORS[form.thematicDomain] : '#6B7280';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-gray-900 border border-gray-700/50 shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Start Your Knowledge Commons</h2>
            <p className="text-sm text-gray-400 mt-0.5">Join the bioregional network</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-800/80 border border-gray-700/40 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors"
            aria-label="Close form"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        {!submitted && (
          <div className="px-6 py-3 border-b border-gray-700/30 bg-gray-800/30">
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <button
                    onClick={() => s.id < step && setStep(s.id)}
                    disabled={s.id > step}
                    className={[
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
                      step === s.id
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : s.id < step
                          ? 'text-gray-400 hover:text-gray-300 cursor-pointer'
                          : 'text-gray-600 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <span className="text-sm">{s.icon}</span>
                    <span className="text-xs font-medium hidden sm:inline">{s.title}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={['w-4 h-px mx-1', s.id < step ? 'bg-emerald-500/50' : 'bg-gray-700'].join(' ')} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Application Submitted!</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  We&apos;ll review your application and reach out within 2-3 business days to schedule an onboarding session.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors font-medium"
                >
                  Close
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step 1: Community */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Community or Organization Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.communityName}
                        onChange={(e) => updateForm({ communityName: e.target.value })}
                        placeholder="e.g., Colorado River Water Keepers"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/40 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                          Your Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.contactName}
                          onChange={(e) => updateForm({ contactName: e.target.value })}
                          placeholder="Jane Smith"
                          className="w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/40 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                          Email <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="email"
                          value={form.contactEmail}
                          onChange={(e) => updateForm({ contactEmail: e.target.value })}
                          placeholder="jane@example.org"
                          className="w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/40 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Website (optional)
                      </label>
                      <input
                        type="url"
                        value={form.website}
                        onChange={(e) => updateForm({ website: e.target.value })}
                        placeholder="https://your-community.org"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/40 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Bioregion */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Bioregion <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={form.bioregionCode}
                        onChange={(e) => updateForm({ bioregionCode: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/40 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                      >
                        <option value="">Select your bioregion...</option>
                        {realms.map((realm) => (
                          <optgroup key={realm} label={realm}>
                            {bioregionOptions.filter((b) => b.realm === realm).map((b) => (
                              <option key={b.code} value={b.code}>
                                {b.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {selectedBioregion && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: realmColor }}
                          />
                          <span className="text-gray-400">{selectedBioregion.realm}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Thematic Domain <span className="text-red-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {THEMATIC_DOMAINS.map((domain) => (
                          <button
                            key={domain.value}
                            type="button"
                            onClick={() => updateForm({ thematicDomain: domain.value })}
                            className={[
                              'p-3 rounded-xl text-left transition-all border',
                              form.thematicDomain === domain.value
                                ? 'bg-gray-700/60 border-emerald-500/50'
                                : 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-800/60',
                            ].join(' ')}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: DOMAIN_COLORS[domain.value] }}
                              />
                              <span className="text-sm font-medium text-white">{domain.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{domain.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {form.thematicDomain && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                          Specific focus area (optional)
                        </label>
                        <input
                          type="text"
                          value={form.otherDomain}
                          onChange={(e) => updateForm({ otherDomain: e.target.value })}
                          placeholder="e.g., groundwater rights, traditional ecological knowledge"
                          className="w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/40 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Knowledge */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Describe your existing knowledge resources <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={form.existingKnowledge}
                        onChange={(e) => updateForm({ existingKnowledge: e.target.value })}
                        placeholder="What knowledge does your community steward? This could include documents, research, maps, oral histories, governance practices, restoration protocols, etc."
                        rows={4}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/40 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum 20 characters. The more detail, the better we can support your onboarding.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        What formats is your knowledge in?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Documents (PDF, Word)',
                          'Spreadsheets',
                          'Maps/GIS',
                          'Images/Photos',
                          'Audio/Video',
                          'Wiki/Website',
                          'Oral/Interviews',
                          'Other',
                        ].map((format) => (
                          <button
                            key={format}
                            type="button"
                            onClick={() => toggleKnowledgeFormat(format)}
                            className={[
                              'px-3 py-1.5 rounded-lg text-sm transition-all border',
                              form.knowledgeFormat.includes(format)
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-gray-800/40 text-gray-400 border-gray-700/40 hover:bg-gray-800/60',
                            ].join(' ')}
                          >
                            {format}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        What do you hope to achieve with your Knowledge Commons?
                      </label>
                      <textarea
                        value={form.goals}
                        onChange={(e) => updateForm({ goals: e.target.value })}
                        placeholder="e.g., Make our water research accessible to the community, connect with other bioregions working on similar issues, preserve traditional knowledge for future generations..."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/40 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Technical */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Does your organization have a GitHub account?
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => updateForm({ hasGithub: true })}
                          className={[
                            'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border',
                            form.hasGithub
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-gray-800/40 text-gray-400 border-gray-700/40 hover:bg-gray-800/60',
                          ].join(' ')}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => updateForm({ hasGithub: false, githubOrg: '' })}
                          className={[
                            'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border',
                            !form.hasGithub
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-gray-800/40 text-gray-400 border-gray-700/40 hover:bg-gray-800/60',
                          ].join(' ')}
                        >
                          No
                        </button>
                      </div>
                      {form.hasGithub && (
                        <input
                          type="text"
                          value={form.githubOrg}
                          onChange={(e) => updateForm({ githubOrg: e.target.value })}
                          placeholder="GitHub organization or username"
                          className="mt-3 w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/40 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Technical capacity in your team
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'low', label: 'Low', description: 'No developers; comfortable with basic web tools' },
                          { value: 'medium', label: 'Medium', description: 'Some technical skills; can learn new tools' },
                          { value: 'high', label: 'High', description: 'Developers on team; comfortable with GitHub, APIs' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateForm({ technicalCapacity: option.value as 'low' | 'medium' | 'high' })}
                            className={[
                              'w-full p-3 rounded-xl text-left transition-all border',
                              form.technicalCapacity === option.value
                                ? 'bg-gray-700/60 border-emerald-500/50'
                                : 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-800/60',
                            ].join(' ')}
                          >
                            <span className="text-sm font-medium text-white">{option.label}</span>
                            <p className="text-xs text-gray-500">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Hosting preference
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => updateForm({ hostingPreference: 'managed' })}
                          className={[
                            'flex-1 p-3 rounded-xl text-left transition-all border',
                            form.hostingPreference === 'managed'
                              ? 'bg-gray-700/60 border-emerald-500/50'
                              : 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-800/60',
                          ].join(' ')}
                        >
                          <span className="text-sm font-medium text-white">Managed</span>
                          <p className="text-xs text-gray-500">We host your agent (recommended)</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateForm({ hostingPreference: 'self-hosted' })}
                          className={[
                            'flex-1 p-3 rounded-xl text-left transition-all border',
                            form.hostingPreference === 'self-hosted'
                              ? 'bg-gray-700/60 border-emerald-500/50'
                              : 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-800/60',
                          ].join(' ')}
                        >
                          <span className="text-sm font-medium text-white">Self-hosted</span>
                          <p className="text-xs text-gray-500">You run your own infrastructure</p>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Review */}
                {step === 5 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white mb-4">Review your application</h3>

                    <div className="rounded-xl bg-gray-800/40 border border-gray-700/40 p-4 space-y-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Community</h4>
                        <p className="text-white">{form.communityName}</p>
                        <p className="text-sm text-gray-400">{form.contactName} · {form.contactEmail}</p>
                        {form.website && <p className="text-sm text-gray-500">{form.website}</p>}
                      </div>

                      <div className="h-px bg-gray-700/40" />

                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Bioregion</h4>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: realmColor }} />
                          <span className="text-white">{selectedBioregion?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: domainColor }} />
                          <span className="text-sm text-gray-400">
                            {THEMATIC_DOMAINS.find((d) => d.value === form.thematicDomain)?.label}
                            {form.otherDomain && ` · ${form.otherDomain}`}
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-gray-700/40" />

                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Knowledge</h4>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{form.existingKnowledge}</p>
                        {form.knowledgeFormat.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {form.knowledgeFormat.map((f) => (
                              <span key={f} className="px-2 py-0.5 rounded-md bg-gray-700/50 text-xs text-gray-400">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-gray-700/40" />

                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Technical</h4>
                        <p className="text-sm text-gray-400">
                          {form.hasGithub ? `GitHub: ${form.githubOrg || 'Yes'}` : 'No GitHub'} ·
                          {' '}{form.technicalCapacity} capacity ·
                          {' '}{form.hostingPreference}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      By submitting, you agree to join the bioregional network and collaborate in good faith.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between">
            <button
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1}
              className={[
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                step === 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60',
              ].join(' ')}
            >
              ← Back
            </button>

            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className={[
                  'px-6 py-2.5 rounded-xl text-sm font-medium transition-all',
                  canProceed()
                    ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed',
                ].join(' ')}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
