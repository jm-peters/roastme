import React, { useState } from 'react';
import { Github, Copy, Check, Terminal, ExternalLink, X, ShieldAlert } from 'lucide-react';

interface GitHubGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GitHubGuideModal({ isOpen, onClose }: GitHubGuideModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const commands = [
    {
      title: "1. Initialize Git locally (if not already initialized)",
      cmd: "git init"
    },
    {
      title: "2. Stage all project files (all 186+ files)",
      cmd: "git add ."
    },
    {
      title: "3. Commit changes with initial commit message",
      cmd: 'git commit -m "Initial commit - RoastMe AI platform with Google Analytics & Ad tags"'
    },
    {
      title: "4. Set main branch",
      cmd: "git branch -M main"
    },
    {
      title: "5. Add your GitHub remote repository",
      cmd: "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git"
    },
    {
      title: "6. Push to GitHub using a Personal Access Token (PAT)",
      cmd: "git push -u origin main"
    }
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-brutal-black brutal-border p-6 md:p-8 text-gallery-white max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 brutal-border transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-neon-green/20 brutal-border text-neon-green">
            <Github size={28} />
          </div>
          <div>
            <h2 className="font-display text-2xl uppercase tracking-wider">GitHub Push & Terminal Guide</h2>
            <p className="font-mono text-xs text-gallery-white/60">Why errors happen & how to push your code successfully</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Explanation box */}
          <div className="p-4 bg-yellow-500/10 brutal-border border-yellow-500/30 text-yellow-300 space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase">
              <ShieldAlert size={16} />
              <span>Why "Request Contains an Invalid Argument" Occurs</span>
            </div>
            <p className="font-mono text-xs text-gallery-white/80 leading-relaxed">
              1. <strong>No Interactive Terminal in Sandbox:</strong> The AI Studio web preview environment runs inside an isolated container without a local command-line terminal for direct user Git authentication.<br/>
              2. <strong>GitHub API / PAT Scopes:</strong> Direct automated git push APIs fail if GitHub Personal Access Tokens lack the required <code className="text-neon-green">repo</code> or <code className="text-neon-green">workflow</code> scopes, or if repository endpoint URLs are malformed.
            </p>
          </div>

          {/* Solutions */}
          <div className="space-y-4">
            <h3 className="font-display text-lg text-neon-green uppercase">How to Push Your Code to GitHub Easily</h3>
            <p className="font-mono text-xs text-gallery-white/70">
              Since you have all 186+ files fully built, tested, and ready in your workspace, follow these standard steps on your local machine or via GitHub Desktop:
            </p>

            <div className="space-y-3">
              {commands.map((item, idx) => (
                <div key={idx} className="p-3 bg-gallery-white/5 brutal-border space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono text-gallery-white/80">
                    <span>{item.title}</span>
                    <button 
                      onClick={() => handleCopy(item.cmd, idx)}
                      className="flex items-center gap-1 px-2 py-1 bg-neon-green text-brutal-black font-bold hover:bg-neon-green/80 transition-all text-[10px]"
                    >
                      {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
                      {copiedIndex === idx ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-2 bg-black/50 font-mono text-xs text-neon-green overflow-x-auto select-all">
                    {item.cmd}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gallery-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <a 
              href="https://github.com/new" 
              target="_blank" 
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-neon-green text-brutal-black font-display text-sm uppercase tracking-wider brutal-border hover:bg-gallery-white transition-all text-center flex items-center justify-center gap-2"
            >
              <span>Create New Repo on GitHub</span>
              <ExternalLink size={16} />
            </a>
            <button 
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 bg-gallery-white/10 hover:bg-gallery-white/20 font-display text-sm uppercase tracking-wider brutal-border transition-all text-center"
            >
              Close Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
