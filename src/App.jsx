import { useState, useEffect, useRef } from 'react';
import { auth, signInWithGoogle, logout, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

const MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 · 70B", provider: "groq", tag: "BUILT-IN", accent: "#5eead4", dimBg: "#061a18" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 · 8B", provider: "groq", tag: "GROQ", accent: "#5eead4", dimBg: "#061a18" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini", tag: "GOOGLE", accent: "#4285F4", dimBg: "#0b1526" },
];

const CATEGORIES = [
  "Web App", "Mobile App", "API / Backend", "CLI Tool", "Data Science",
  "AI / ML", "Design System", "Documentation", "Game Dev",
  "DevOps", "Database", "Other"
];

const TEMPLATES = [
  { 
    label: "Code Review", 
    category: "Web App",
    prompt: "Perform a deep-dive code review of this component. Focus on: 1. React performance (unnecessary re-renders), 2. Clean code principles, 3. Potential security vulnerabilities, and 4. Accessibility (ARIA labels)." 
  },
  { 
    label: "RAG Pipeline", 
    category: "AI / ML",
    prompt: "Architect a robust RAG (Retrieval Augmented Generation) pipeline. Define the vector database strategy, embedding model choice, and the retrieval logic (e.g., hybrid search with reranking) for a technical documentation search." 
  },
  { 
    label: "Unit Tester", 
    category: "Web App",
    prompt: "Write comprehensive unit tests for this function using Jest and React Testing Library. Cover edge cases, mock all external dependencies, and ensure 100% branch coverage." 
  },
  { 
    label: "Security Audit", 
    category: "DevOps",
    prompt: "Analyze this code for common security flaws like SQL injection, XSS, CSRF, and insecure data handling. Provide a detailed report of findings and recommended fixes." 
  },
  { 
    label: "Refactor Pro", 
    category: "Web App",
    prompt: "Refactor this code to follow the DRY (Don't Repeat Yourself) principle and improve readability. Maintain identical functionality but significantly reduce cognitive complexity." 
  },
  { 
    label: "Regex Master", 
    category: "Other",
    prompt: "Create a complex regular expression to validate an international phone number including country codes and extensions. Explain every capture group and quantifier in detail." 
  },
  { 
    label: "Readme Architect", 
    category: "Documentation",
    prompt: "Generate a professional GitHub README for this project. Include: Badges, Installation, Usage examples, API Reference, Roadmap, and Contribution guidelines." 
  },
  { 
    label: "SQL Agent", 
    category: "Database",
    prompt: "Create a system prompt for an LLM that acts as a Senior Database Engineer. It must translate complex natural language requests into optimized PostgreSQL queries." 
  }
];

const CODE_SNIPPETS = [
  "const prompt = refine(raw);",
  "fn structure(input) { }",
  "SELECT * FROM raw_prompts;",
  "import { craft } from '@ai/sdk';",
  "curl -X POST /v1/refine",
  "async function transform(raw) {",
  "return structured_output;",
  "docker run promptify --raw",
  "module.exports = { refine }",
  "while (!perfect) { refine(); }",
  "npm run generate --watch",
  "{ status: 200, prompt: result }",
  "git commit -m 'feat: add hints'",
  "const build = (raw) => refine(raw)",
  "pip install promptify",
  "grep -r 'TODO' ./prompts/",
  "printf '%s' $PROMPT | refine",
  "docker compose up --build"
];

const buildSystemPrompt = (category) => `
You are an elite prompt engineer. Transform the rough user input into an
exhaustive, production-ready prompt for a ${category} project.

Output EXACTLY in this format:

## 🎯 Role & Context
Define the AI's exact role, expertise level, and technical context.

## 📋 Task Overview
Precise, unambiguous description of what needs to be accomplished.

## ⚙️ Technical Requirements
All languages, frameworks, libraries, versions, tools, environments, APIs.

## ✨ Core Features & Functionality
Comprehensive feature list — obvious AND implicit features user didn't mention.

## 🔧 Implementation Details
Step-by-step approach, architecture patterns, key functions, data structures.

## 🚫 Constraints & Anti-patterns
What to AVOID — pitfalls, bad patterns, out-of-scope items.

## 📐 Code Style & Standards
Naming conventions, file structure, error handling, testing approach.

## 📤 Output Format
Exact structure of expected output — file names, directory layout, schemas.

## ✅ Success Criteria
Concrete test cases, edge cases, acceptance criteria, performance targets.

Be exhaustive. Add hints the user forgot but will need.
Make it so an AI can execute with zero ambiguity.
`;

function SimpleMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div style={{ padding: '20px' }}>
      {lines.map((line, i) => {
        if (line.trim() === '') return <div key={i} style={{ height: '6px' }} />;
        if (line.trim() === '---') return <hr key={i} style={{ border: 'none', borderTop: '1px solid #1e1e1e', margin: '16px 0' }} />;
        if (line.startsWith('## ')) {
          let headerText = line.substring(3).trim();
          const emojiMatch = headerText.match(/^[\p{Emoji}\u200d]+\s*/u);
          if (emojiMatch) headerText = headerText.substring(emojiMatch[0].length);
          return (
            <div key={i} style={{
              fontSize: '11px', textTransform: 'uppercase', color: '#e8c547',
              letterSpacing: '0.18em', marginTop: '24px', marginBottom: '12px'
            }}>
              {headerText}
            </div>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <div key={i} style={{
              fontSize: '14px', color: '#f0e8d8', fontWeight: 'bold',
              marginTop: '24px', marginBottom: '12px'
            }}>
              {line.substring(2)}
            </div>
          );
        }
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={i} style={{
              color: '#b8b0a4', fontSize: '12.5px', lineHeight: '1.85',
              display: 'flex', gap: '8px', marginBottom: '4px'
            }}>
              <span style={{ color: '#e8c547' }}>›</span>
              <span>{renderBold(line.trim().substring(2))}</span>
            </div>
          );
        }
        return (
          <div key={i} className="code-font" style={{
            color: '#b8b0a4', fontSize: '13px', lineHeight: '1.8', marginBottom: '6px'
          }}>
            {renderBold(line)}
          </div>
        );
      })}
    </div>
  );
}

function renderBold(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={index} style={{ color: '#e8ddd0', fontWeight: '600' }}>
          {part.substring(2, part.length - 2)}
        </span>
      );
    }
    return part;
  });
}

function LoadingBubbles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { const parent = canvas.parentElement; canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; };
    resize();
    window.addEventListener('resize', resize);
    const snippets = CODE_SNIPPETS.map(text => ({
      text, x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      speed: 0.6 + Math.random() * 0.9, opacity: 0.12 + Math.random() * 0.20
    }));
    let animationFrameId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "12px 'JetBrains Mono', monospace";
      snippets.forEach(snippet => {
        snippet.y -= snippet.speed;
        snippet.x += Math.sin(snippet.y * 0.01) * 0.5;
        if (snippet.y < -20) { snippet.y = canvas.height + 20; snippet.x = Math.random() * canvas.width; }
        ctx.fillStyle = `rgba(232, 197, 71, ${snippet.opacity})`;
        ctx.fillText(snippet.text, snippet.x, snippet.y);
      });
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();
    return () => { window.removeEventListener('resize', resize); window.cancelAnimationFrame(animationFrameId); };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '560px', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 1, backgroundColor: 'rgba(9,9,9,0.5)'
      }}>
        <div style={{ position: 'relative', width: '200px', height: '1px', background: '#1c1c1c', overflow: 'hidden', marginBottom: '16px' }}>
          <div className="loading-bar"></div>
        </div>
        <div style={{ color: '#444', fontSize: '10px', letterSpacing: '0.25em' }}>REFINING PROMPT...</div>
      </div>
    </div>
  );
}

const LoginModal = ({ onLogin, onGuest }) => (
  <div style={{
    height: '100vh', background: '#0c0c0c', color: '#f0e8d8',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'JetBrains Mono', monospace", position: 'relative', zIndex: 10
  }}>
    <div style={{
      position: 'relative', zIndex: 1, width: '400px', padding: '48px',
      background: '#0c0c0c', border: '2px solid #e8c547',
      boxShadow: '12px 12px 0px #1a1a0e'
    }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.05em' }}>PROMPTIFY</div>
      <div style={{ fontSize: '10px', color: '#e8c547', marginBottom: '32px', letterSpacing: '0.2em' }}>RAW TO STRUCTURED</div>
      <button onClick={onLogin} style={{ width: '100%', padding: '16px', background: '#e8c547', color: '#0c0c0c', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 3.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        CONTINUE WITH GOOGLE
      </button>
      <button onClick={onGuest} style={{ width: '100%', padding: '16px', background: 'transparent', color: '#f0e8d8', border: '1px solid #333', fontWeight: 'bold', cursor: 'pointer' }}>CONTINUE WITHOUT LOGIN</button>
      <div style={{ marginTop: '24px', background: '#1a0e0e', border: '1px solid #3d1414', padding: '12px' }}>
        <div style={{ color: '#ff4d4d', fontSize: '9px', fontWeight: 'bold', marginBottom: '4px' }}>CAUTION</div>
        <div style={{ color: '#888', fontSize: '10px', lineHeight: '1.6' }}>Continuing without login means your prompt history will not be saved. You may lose your refined prompts upon page refresh.</div>
      </div>
    </div>
  </div>
);

export default function Promptify() {
  const [rawPrompt, setRawPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [category, setCategory] = useState("Web App");
  const [model, setModel] = useState(MODELS[0]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [hoveredHint, setHoveredHint] = useState(null);
  const [warning, setWarning] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  
  const bgCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsGuest(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "history"), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        historyData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setHistory(historyData);
      }, (err) => console.error("Firestore error:", err));
      return () => unsubscribe();
    } else {
      setHistory([]);
    }
  }, [user]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: #0c0c0c; font-family: 'Outfit', sans-serif; color: #f0e8d8; overflow-x: hidden; }
      textarea, input, button { font-family: 'Outfit', sans-serif; }
      .code-font { font-family: 'JetBrains Mono', monospace !important; }
      textarea::placeholder, input::placeholder { color: #333; }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: #0e0e0e; }
      ::-webkit-scrollbar-thumb { background: #2a2a2a; }
      button:active { transform: scale(0.98); }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes sweep { 0% { left: -60%; width: 60%; } 100% { left: 110%; width: 60%; } }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      @keyframes blinkRed { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      .loading-bar { position: absolute; height: 100%; width: 40%; background: linear-gradient(90deg, transparent, #e8c547, transparent); animation: sweep 1.4s ease-in-out infinite; left: -40%; }
    `;
    document.head.appendChild(style);
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const snippets = CODE_SNIPPETS.map(text => ({ text, x: Math.random() * canvas.width, y: Math.random() * canvas.height, speed: 0.08 + Math.random() * 0.12, opacity: 0.02 + Math.random() * 0.03 }));
    let animationFrameId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "14px 'JetBrains Mono', monospace";
      snippets.forEach(snippet => {
        snippet.y -= snippet.speed;
        snippet.x += Math.sin(snippet.y * 0.005) * 0.2;
        if (snippet.y < -20) { snippet.y = canvas.height + 20; snippet.x = Math.random() * canvas.width; }
        ctx.fillStyle = `rgba(232, 197, 71, ${snippet.opacity})`;
        ctx.fillText(snippet.text, snippet.x, snippet.y);
      });
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();
    return () => { document.head.removeChild(style); window.removeEventListener('resize', resize); window.cancelAnimationFrame(animationFrameId); };
  }, []);

  const handleCopy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const generatePrompt = async () => {
    if (!rawPrompt.trim()) return;
    setLoading(true); setError(""); setOutput("");
    try {
      let resultText = "";
      const imageAttachments = attachments.filter(a => a.type.startsWith('image/'));
      if (model.provider === "anthropic") {
        const content = [{ type: "text", text: rawPrompt }];
        for (const img of imageAttachments) content.push({ type: "image", source: { type: "base64", media_type: img.type, data: img.preview.split(',')[1] } });
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: model.id, max_tokens: 1000, system: buildSystemPrompt(category), messages: [{ role: "user", content }] })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "Anthropic Error");
        resultText = data.content?.[0]?.text || "";
      } else if (model.provider === "groq") {
        if (attachments.length > 0) { setWarning("Llama models on Groq are currently text-only. Switch to Gemini for images."); setLoading(false); return; }
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY },
          body: JSON.stringify({ model: model.id, max_tokens: 1000, messages: [{ role: "system", content: buildSystemPrompt(category) }, { role: "user", content: rawPrompt }] })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "Groq Error");
        resultText = data.choices?.[0]?.message?.content || "";
      } else if (model.provider === "gemini") {
        const parts = [{ text: rawPrompt }];
        for (const img of imageAttachments) parts.push({ inlineData: { mimeType: img.type, data: img.preview.split(',')[1] } });
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: buildSystemPrompt(category) }] }, contents: [{ parts }] })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "Gemini Error");
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      setOutput(resultText);
      if (user) await addDoc(collection(db, "history"), { userId: user.uid, rawPrompt, output: resultText, category, model: model.name, createdAt: serverTimestamp() });
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const handleLogin = async () => { try { await signInWithGoogle(); } catch (err) { setError("Login failed: " + err.message); } };

  return (
    <div style={{ background: '#0c0c0c', minHeight: '100vh', width: '100%' }}>
      <canvas ref={bgCanvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }} />
      {!user && !isGuest ? (
        <LoginModal onLogin={handleLogin} onGuest={() => setIsGuest(true)} />
      ) : (
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1160px', margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 28px' }}>
          
          <header style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px', 
            padding: '12px 0',
            gap: isMobile ? '12px' : '24px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '12px' : '24px',
              flex: 1,
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
                <div style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: '900', letterSpacing: '0.05em', color: '#fff' }}>PROMPTIFY</div>
                <div style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: '800', color: '#e8c547', letterSpacing: '0.1em' }}>v1.0</div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '6px', 
                alignItems: 'center',
                overflowX: 'auto',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                padding: '4px 0'
              }}>
                <button onClick={() => setShowHistory(true)} style={{ flexShrink: 0, height: '36px', background: '#090909', border: '1px solid #e8c547', color: '#e8c547', padding: isMobile ? '0 10px' : '0 14px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>☰</span> {!isMobile && "HISTORY"}
                </button>
                <button onClick={() => setShowContact(true)} style={{ flexShrink: 0, height: '36px', background: '#090909', border: '1px solid #e8c547', color: '#e8c547', padding: isMobile ? '0 10px' : '0 14px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px' }}>✉</span> {!isMobile && "CONTACT"}
                </button>
                <button onClick={() => setShowAbout(true)} style={{ flexShrink: 0, height: '36px', background: '#090909', border: '1px solid #e8c547', color: '#e8c547', padding: isMobile ? '0 10px' : '0 14px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px' }}>ℹ</span> {!isMobile && "ABOUT"}
                </button>
                <button onClick={() => setShowFeedback(true)} style={{ flexShrink: 0, height: '36px', background: '#090909', border: '1px solid #e8c547', color: '#e8c547', padding: isMobile ? '0 12px' : '0 16px', fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isMobile ? "💬" : "FEEDBACK"}
                </button>
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
                  <div style={{ width: isMobile ? '30px' : '36px', height: isMobile ? '30px' : '36px', background: '#00a6a6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: isMobile ? '12px' : '16px', borderRadius: '2px' }}>
                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                  {!isMobile && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '11px', fontWeight: '900', color: '#fff', lineHeight: '1.2' }}>{user.displayName ? user.displayName.toUpperCase().split(' ')[0] : 'USER'}</div>
                      <button onClick={() => logout()} style={{ background: 'transparent', border: 'none', color: '#444', fontSize: '9px', padding: '0', cursor: 'pointer', textAlign: 'left', textDecoration: 'underline', marginTop: '4px' }}>LOGOUT</button>
                    </div>
                  )}
                  {isMobile && (
                    <button onClick={() => logout()} style={{ background: 'transparent', border: 'none', color: '#444', fontSize: '8px', cursor: 'pointer', textDecoration: 'underline' }}>LOGOUT</button>
                  )}
                </div>
              ) : (
                <button onClick={() => handleLogin()} style={{ background: '#e8c547', border: 'none', color: '#000', fontSize: '9px', fontWeight: '900', padding: isMobile ? '8px 12px' : '8px 16px', cursor: 'pointer' }}>LOGIN</button>
              )}
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '48px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '30px', marginBottom: '12px' }}>
                <div style={{ border: '1px solid #e8c547', padding: '4px 10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e8c547' }}>RAW INPUT</div>
                </div>
                <button onClick={() => { setRawPrompt(''); setOutput(''); setAttachments([]); }} style={{ background: 'transparent', border: 'none', color: '#444', fontSize: '10px', cursor: 'pointer' }}>CLEAR</button>
              </div>

              <div style={{ position: 'relative' }}>
                <textarea
                  value={rawPrompt}
                  onChange={(e) => setRawPrompt(e.target.value)}
                  placeholder={"dump your rough idea here...\nno structure required"}
                  style={{ width: '100%', height: '360px', background: '#090909', border: '1px solid #e8c547', color: '#f0e8d8', padding: '24px', fontSize: '15px', lineHeight: '1.6', resize: 'none', outline: 'none', borderRadius: '0' }}
                />
                <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                  <button onClick={() => setAttachMenuOpen(!attachMenuOpen)} style={{ background: '#111', border: '1px solid #222', color: '#e8c547', width: '32px', height: '32px', fontSize: '20px', borderRadius: '0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  {attachMenuOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#0a0a0a', border: '1px solid #e8c547', padding: '4px', width: '180px', zIndex: 10 }}>
                      <button onClick={() => { fileInputRef.current.click(); setAttachMenuOpen(false); }} style={{ textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#888', fontSize: '11px', width: '100%', cursor: 'pointer' }}>ADD PHOTO / FILES</button>
                      <button onClick={() => { setAttachMenuOpen(false); }} style={{ textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#888', fontSize: '11px', width: '100%', cursor: 'pointer' }}>TAKE SCREENSHOT</button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setAttachments(prev => [...prev, { id: Date.now(), name: file.name, type: file.type, preview: file.type.startsWith('image/') ? ev.target.result : null }]);
                      if (file.type.startsWith('image/')) reader.readAsDataURL(file); else reader.readAsText(file);
                    }
                  }} />
                </div>
              </div>

              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#0a0a0a', border: '1px solid #161616' }}>
                  {attachments.map(att => (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#141414', border: '1px solid #222', padding: '4px 8px' }}>
                      {att.preview ? <img src={att.preview} style={{ width: '20px', height: '20px', objectFit: 'cover' }} /> : <span style={{ fontSize: '12px' }}>📄</span>}
                      <span style={{ fontSize: '10px', color: '#888', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                      <button 
                        onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} 
                        style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '12px', animation: 'blinkRed 1s infinite' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ border: '1px solid #e8c547', padding: '4px 10px', display: 'inline-block', marginBottom: '8px' }}>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#e8c547', letterSpacing: '0.15em' }}>PROJECT CATEGORY</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setCatDropdownOpen(!catDropdownOpen)} style={{ width: '100%', padding: '14px 16px', background: '#111', border: '1px solid #222', color: '#e8c547', textAlign: 'left', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>{category.toUpperCase()} <span>▼</span></button>
                    {catDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0a', border: '1px solid #1c1c1c', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                        {CATEGORIES.map(cat => <button key={cat} onClick={() => { setCategory(cat); setCatDropdownOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px', background: 'transparent', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer' }}>{cat.toUpperCase()}</button>)}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ border: '1px solid #e8c547', padding: '4px 10px', display: 'inline-block', marginBottom: '8px' }}>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#e8c547', letterSpacing: '0.15em' }}>AI MODEL</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setModelDropdownOpen(!modelDropdownOpen)} style={{ width: '100%', padding: '14px 16px', background: '#111', border: '1px solid #222', color: '#fff', textAlign: 'left', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '6px', height: '6px', background: model.accent }} />
                        {model.name.toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '8px', background: model.dimBg, color: model.accent, padding: '2px 6px' }}>{model.tag}</div>
                        <span style={{ fontSize: '10px', color: '#444' }}>▼</span>
                      </div>
                    </button>
                    {modelDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0a', border: '1px solid #1c1c1c', zIndex: 100 }}>
                        {MODELS.map(m => <button key={m.id} onClick={() => { setModel(m); setModelDropdownOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px', background: 'transparent', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>{m.name.toUpperCase()} <span style={{ fontSize: '8px', color: m.accent }}>{m.tag}</span></button>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={generatePrompt} disabled={!rawPrompt.trim() || loading} style={{ width: '100%', padding: '20px', background: loading ? '#222' : (rawPrompt.trim() ? '#e8c547' : '#1a1a0e'), color: rawPrompt.trim() ? '#000' : '#333', border: 'none', fontWeight: '900', letterSpacing: '0.15em', cursor: loading ? 'wait' : 'pointer' }}>{loading ? "REFINING..." : "REFINE PROMPT →"}</button>

              <div style={{ marginTop: '12px' }}>
                <div style={{ border: '1px solid #e8c547', padding: '4px 10px', display: 'inline-block', marginBottom: '12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '800', color: '#e8c547', letterSpacing: '0.15em' }}>QUICK PROMPT</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {TEMPLATES.map((t, i) => (
                    <button key={i} onClick={() => { setRawPrompt(t.prompt); setCategory(t.category); }} style={{ 
                      textAlign: 'left', padding: '12px', background: '#0a0a0a', border: '1px solid #141414', 
                      color: '#666', fontSize: '9px', fontWeight: '800', cursor: 'pointer',
                      transition: 'all 0.2s'
                    }} onMouseEnter={(e) => { e.target.style.borderColor = '#e8c547'; e.target.style.color = '#e8c547'; }} onMouseLeave={(e) => { e.target.style.borderColor = '#141414'; e.target.style.color = '#666'; }}>
                      {t.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '30px', marginBottom: '12px' }}>
                <div style={{ border: '1px solid #e8c547', padding: '4px 10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e8c547' }}>STRUCTURED OUTPUT</div>
                </div>
                {output && <button onClick={handleCopy} style={{ background: 'transparent', border: '1px solid #222', color: '#888', padding: '4px 12px', fontSize: '10px', cursor: 'pointer' }}>{copied ? "COPIED" : "COPY"}</button>}
              </div>
              <div style={{ border: '1px solid #e8c547', background: '#090909', height: '600px', overflowY: 'auto', borderRadius: '0', position: 'relative' }}>
                {loading ? <LoadingBubbles /> : output ? <SimpleMarkdown text={output} /> : (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.2em' }}>AWAITING INPUT</div>
                    <div style={{ fontSize: '8px', marginTop: '12px' }}>STRUCTURED PROMPT WILL APPEAR HERE</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: "ROLE", text: "Defines the AI persona and context", detail: "Establishes who the AI should be. E.g., 'Act as a Senior React Architect'." },
                  { label: "TASK", text: "The specific objective and goal", detail: "The unambiguous action the AI must take." },
                  { label: "HINTS", text: "Constraints and small details", detail: "Contextual guardrails. Mention specific libraries." },
                  { label: "CRITERIA", text: "Success metrics and formatting", detail: "The finish line. Define the exact output format." }
                ].map((hint, i) => (
                  <div key={i} onMouseEnter={() => setHoveredHint(i)} onMouseLeave={() => setHoveredHint(null)} style={{ background: '#0a0a0a', border: '1px solid #141414', padding: '16px', position: 'relative', cursor: 'help' }}>
                    {hoveredHint === i && (
                      <div style={{ position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, right: 0, background: '#0f0f0c', border: '1px solid #e8c547', padding: '12px', zIndex: 100, animation: 'fadeInUp 0.2s ease-out' }}>
                        <div style={{ fontSize: '8px', color: '#e8c547', fontWeight: '900', marginBottom: '4px' }}>DEEP INSIGHT</div>
                        <div style={{ fontSize: '10px', color: '#ccc', lineHeight: '1.4' }}>{hint.detail}</div>
                      </div>
                    )}
                    <div style={{ fontSize: '9px', fontWeight: '900', color: '#555', letterSpacing: '0.15em', marginBottom: '6px' }}>{hint.label}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{hint.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(showHistory || showContact || showAbout || showFeedback) && <div onClick={() => { setShowHistory(false); setShowContact(false); setShowAbout(false); setShowFeedback(false); }} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 100, backdropFilter: 'blur(4px)' }} />}
          
          <div style={{ position: 'fixed', top: 0, left: showHistory ? 0 : '-350px', width: '320px', height: '100vh', background: '#090909', borderRight: '1px solid #1c1c1c', zIndex: 101, transition: 'left 0.3s ease', display: 'flex', flexDirection: 'column', padding: '32px 0' }}>
            <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}><div style={{ fontSize: '10px', color: '#e8c547', letterSpacing: '0.2em' }}>HISTORY</div><button onClick={() => setShowHistory(false)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer' }}>✕</button></div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!user ? (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#e8c547', marginBottom: '16px', letterSpacing: '0.1em' }}>LOGIN TO STORE HISTORY</div>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '32px', lineHeight: '1.6' }}>Signing in allows you to save and access your refined prompts across all devices.</div>
                  <button onClick={handleLogin} style={{ 
                    width: '100%', padding: '16px', background: '#fff', color: '#000', 
                    border: 'none', fontWeight: '900', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 3.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                    CONTINUE WITH GOOGLE
                  </button>
                </div>
              ) : (
                history.map(item => (
                  <button key={item.id} onClick={() => { setRawPrompt(item.rawPrompt); setOutput(item.output); setCategory(item.category); setShowHistory(false); }} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '16px 24px', cursor: 'pointer', borderBottom: '1px solid #141414' }}>
                    <div style={{ fontSize: '8px', color: '#e8c547', marginBottom: '4px' }}>{item.category.toUpperCase()}</div>
                    <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.rawPrompt}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div style={{ position: 'fixed', top: 0, right: showContact ? 0 : '-350px', width: '350px', height: '100vh', background: '#090909', borderLeft: '1px solid #1c1c1c', zIndex: 101, transition: 'right 0.3s ease', display: 'flex', flexDirection: 'column', padding: '32px 0' }}>
            <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}><div style={{ fontSize: '10px', color: '#e8c547', letterSpacing: '0.2em' }}>CONTACT</div><button onClick={() => setShowContact(false)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer' }}>✕</button></div>
            <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.1em', marginBottom: '8px' }}>EMAIL</div>
                <a href="mailto:ujjwalverma010305@gmail.com" style={{ fontSize: '13px', color: '#e8c547', textDecoration: 'none', fontWeight: '800' }}>ujjwalverma010305@gmail.com</a>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.1em', marginBottom: '8px' }}>X / TWITTER</div>
                <a href="https://x.com/Ujjwal_v01" target="_blank" style={{ fontSize: '13px', color: '#e8c547', textDecoration: 'none', fontWeight: '800' }}>x.com/Ujjwal_v01</a>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.1em', marginBottom: '8px' }}>PERSONAL WEBSITE</div>
                <a href="https://devujjwal.vercel.app" target="_blank" style={{ fontSize: '13px', color: '#e8c547', textDecoration: 'none', fontWeight: '800' }}>devujjwal.vercel.app</a>
              </div>
            </div>
          </div>

          <div style={{ position: 'fixed', top: 0, right: showFeedback ? 0 : '-350px', width: '350px', height: '100vh', background: '#090909', borderLeft: '1px solid #1c1c1c', zIndex: 101, transition: 'right 0.3s ease', display: 'flex', flexDirection: 'column', padding: '32px 0' }}>
            <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}><div style={{ fontSize: '10px', color: '#e8c547', letterSpacing: '0.2em' }}>FEEDBACK</div><button onClick={() => { setShowFeedback(false); setTimeout(() => { setFeedbackSent(false); setFeedbackEmail(""); setFeedbackText(""); }, 300); }} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer' }}>✕</button></div>
            {!feedbackSent ? (
              <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div><div style={{ fontSize: '9px', color: '#555', marginBottom: '8px' }}>YOUR EMAIL</div><input type="email" value={feedbackEmail} onChange={(e) => setFeedbackEmail(e.target.value)} style={{ width: '100%', background: '#0c0c0c', border: '1px solid #1c1c1c', color: '#fff', padding: '12px', borderRadius: '0', outline: 'none' }} /></div>
                <div><div style={{ fontSize: '9px', color: '#555', marginBottom: '8px' }}>YOUR FEEDBACK</div><textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} style={{ width: '100%', height: '200px', background: '#0c0c0c', border: '1px solid #1c1c1c', color: '#fff', padding: '12px', borderRadius: '0', outline: 'none', resize: 'none' }} /></div>
                <button onClick={() => setFeedbackSent(true)} style={{ width: '100%', padding: '16px', background: '#e8c547', border: 'none', fontWeight: '900', cursor: 'pointer' }}>SUBMIT FEEDBACK</button>
              </div>
            ) : (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}><div style={{ fontSize: '14px', color: '#e8c547', fontWeight: '800' }}>THANK YOU!</div><div style={{ fontSize: '11px', color: '#666', marginTop: '12px' }}>Your feedback has been received.</div></div>
            )}
          </div>

          <div style={{ position: 'fixed', top: 0, right: showAbout ? 0 : '-350px', width: '320px', height: '100vh', background: '#090909', borderLeft: '1px solid #1c1c1c', zIndex: 101, transition: 'right 0.3s ease', display: 'flex', flexDirection: 'column', padding: '32px 0' }}>
            <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}><div style={{ fontSize: '10px', color: '#e8c547', letterSpacing: '0.2em' }}>ABOUT</div><button onClick={() => setShowAbout(false)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer' }}>✕</button></div>
            <div style={{ padding: '24px', color: '#888', fontSize: '13px', lineHeight: '1.8' }}>PROMPTIFY is a high-performance prompt engineering engine designed for elite developers.</div>
          </div>
          
          <footer style={{ marginTop: '80px', paddingTop: '20px', borderTop: '1px solid #141414', display: 'flex', justifyContent: 'space-between' }}><div style={{ fontSize: '9px', color: '#222' }}>PROMPTIFY // RAW TO STRUCTURED</div></footer>
        </div>
      )}
      {warning && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '400px', padding: '40px', background: '#0c0c0c', border: '1px solid #ff4d4d', textAlign: 'center' }}><div style={{ fontSize: '14px', color: '#ff4d4d', marginBottom: '24px' }}>{warning.toUpperCase()}</div><button onClick={() => setWarning(null)} style={{ width: '100%', padding: '14px', background: '#ff4d4d', color: '#fff', border: 'none', fontWeight: '800', cursor: 'pointer' }}>DISMISS</button></div>
        </div>
      )}
    </div>
  );
}
