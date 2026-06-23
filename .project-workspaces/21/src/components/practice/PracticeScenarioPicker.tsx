import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePracticeMode } from './PracticeModeContext';
import { SCENARIO_CATEGORIES, ALL_SCENARIOS, getVisibleCategories, getScenariosForCategory, type ScenarioCategory } from './practiceScenarios';
import PrivateModeUnlock from './PrivateModeUnlock';

interface PracticeScenarioPickerProps {
  matureMode?: boolean;
  onEnableMatureMode?: () => void;
}

export default function PracticeScenarioPicker({ matureMode = false, onEnableMatureMode }: PracticeScenarioPickerProps) {
  const { showScenarioPicker, selectScenario, setShowScenarioPicker, deactivate } = usePracticeMode();
  const [activeCategory, setActiveCategory] = useState<ScenarioCategory>('foundation');
  const [showUnlock, setShowUnlock] = useState(false);

  const visibleCategories = getVisibleCategories(matureMode);
  const scenarios = getScenariosForCategory(activeCategory, matureMode);

  const handleCategoryTap = (catId: ScenarioCategory, requiresMature?: boolean) => {
    if (requiresMature && !matureMode) {
      setShowUnlock(true);
      return;
    }
    setActiveCategory(catId);
  };

  const handleUnlock = () => {
    setShowUnlock(false);
    onEnableMatureMode?.();
    setActiveCategory('private');
  };

  return (
    <>
      <PrivateModeUnlock
        open={showUnlock}
        onUnlock={handleUnlock}
        onDismiss={() => setShowUnlock(false)}
      />

      <AnimatePresence>
        {showScenarioPicker && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => { setShowScenarioPicker(false); deactivate(); }}
            />

            {/* Panel — anchored to bottom of viewport */}
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div
                className="rounded-t-2xl border-t border-white/[0.12] overflow-hidden"
                style={{
                  backdropFilter: 'blur(24px) saturate(1.6)',
                  WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
                  background: 'linear-gradient(to bottom, rgba(15,18,33,0.92), rgba(15,18,33,0.98))',
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,80,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-2.5 pb-1">
                  <div className="w-8 h-1 rounded-full bg-white/20" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-2">
                  <span
                    className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                  >
                    Choose a scenario
                  </span>
                  <button
                    onClick={() => { setShowScenarioPicker(false); deactivate(); }}
                    className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
                  >
                    cancel
                  </button>
                </div>

                {/* Category tabs */}
                <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {visibleCategories.map(cat => {
                    // Show locked private category even when not in mature mode
                    const isLocked = cat.requiresMature && !matureMode;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryTap(cat.id, cat.requiresMature)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wide transition-all active:scale-95 border ${
                          activeCategory === cat.id
                            ? 'border-primary/40 bg-primary/10 text-primary/90'
                            : 'border-white/[0.08] text-white/50 hover:border-white/20'
                        }`}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    );
                  })}
                  {/* Show locked Private tab when not in mature mode */}
                  {!matureMode && (
                    <button
                      onClick={() => setShowUnlock(true)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wide transition-all active:scale-95 border border-white/[0.06] text-white/30 hover:border-primary/20"
                    >
                      🔒 Private Dynamics
                    </button>
                  )}
                </div>

                {/* Scenarios */}
                <div className="px-3 pb-3 space-y-1.5 max-h-[45dvh] overflow-y-auto overscroll-contain">
                  {scenarios.map((scenario, i) => (
                    <motion.button
                      key={scenario.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => selectScenario(scenario)}
                      className="w-full text-left rounded-xl border border-white/[0.08] p-3 hover:border-primary/30 hover:bg-white/[0.04] transition-all active:scale-[0.98] group"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm">{scenario.emoji}</span>
                        <span className="text-[12px] font-semibold text-white/80 group-hover:text-primary/90 transition-colors">
                          {scenario.title}
                        </span>
                      </div>
                      <p
                        className="text-[11px] text-white/45 leading-relaxed pl-6"
                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                      >
                        {scenario.description}
                      </p>
                    </motion.button>
                  ))}

                  {scenarios.length === 0 && (
                    <p className="text-[11px] text-white/30 text-center py-4">
                      No scenarios available in this category
                    </p>
                  )}
                </div>

                <div className="px-4 pb-4">
                  <p className="text-[10px] text-white/25 text-center">
                    Your companion will coach you through it
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
