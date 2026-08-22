import { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Code2, 
  Terminal, 
  CheckCircle2, 
  ArrowRight, 
  Zap,
  Globe,
  Palette,
  Database
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const starterIdeas = [
    {
      title: "Interactive AI Chat & Assistant",
      desc: "Conversational interface with multi-modal tools, markdown rendering, and export features.",
      icon: Sparkles,
      color: "text-amber-600 bg-amber-50 border-amber-200"
    },
    {
      title: "Full-Stack Data Dashboard",
      desc: "Real-time metrics visualization, filters, data export, and customizable interactive widgets.",
      icon: Layers,
      color: "text-blue-600 bg-blue-50 border-blue-200"
    },
    {
      title: "Creative Canvas & Design Tool",
      desc: "Interactive canvas for drawing, generative layout creation, and component prototyping.",
      icon: Palette,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200"
    },
    {
      title: "Productivity & Workspace Hub",
      desc: "Kanban task boards, note-taking with local persistence, calendar scheduling, and tags.",
      icon: Database,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200"
    }
  ];

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard?.writeText(prompt);
    setCopiedPrompt(prompt);
    setTimeout(() => setCopiedPrompt(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 tracking-tight">AI Studio Preview</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium border border-emerald-200">
                Live & Ready
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Container Port: 3000
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero & Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-2xl mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ready for your application instructions</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-4 leading-tight">
            What would you like to build today?
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Your live workspace is fully connected and ready. Describe any app, tool, or dashboard in the chat to start building immediately.
          </p>
        </motion.div>

        {/* Action / Concept Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl mb-12">
          {starterIdeas.map((idea, index) => {
            const Icon = idea.icon;
            const isSelected = selectedFeature === idea.title;

            return (
              <motion.div
                key={idea.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                onClick={() => setSelectedFeature(idea.title)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer text-left relative bg-white ${
                  isSelected 
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md' 
                    : 'border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${idea.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyPrompt(`Build a ${idea.title}: ${idea.desc}`);
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-50 hover:bg-indigo-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                  >
                    {copiedPrompt === `Build a ${idea.title}: ${idea.desc}` ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <span>Use Prompt</span>
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
                <h3 className="font-semibold text-slate-900 text-base mb-1.5">{idea.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{idea.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Quick System Environment Overview */}
        <div className="w-full max-w-4xl p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Environment Configured</div>
              <div className="text-xs text-slate-500">React 19 • Tailwind CSS • Motion • Lucide Icons</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              Ready for Prompt
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span>Connected to AI Studio container</span>
          </div>
          <div>Send any prompt in the chat to replace this screen with your custom application.</div>
        </div>
      </footer>
    </div>
  );
}
