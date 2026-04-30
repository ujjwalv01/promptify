import { useState, useEffect, useRef } from 'react';

const MODELS = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4.6", provider: "anthropic", tag: "BUILT-IN", accent: "#e8c547", dimBg: "#1e1a06" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 · 70B", provider: "groq", tag: "GROQ", accent: "#5eead4", dimBg: "#061a18" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 · 8B", provider: "groq", tag: "GROQ", accent: "#5eead4", dimBg: "#061a18" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini", tag: "GOOGLE", accent: "#4285F4", dimBg: "#0b1526" },
];

const CATEGORIES = [
  "Web App", "Mobile App", "API / Backend", "CLI Tool", "Data Science",
  "AI / ML", "Design System", "Documentation", "Game Dev",
  "DevOps", "Database", "Other"
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
        if (line.trim() === '') {
          return <div key={i} style={{ height: '6px' }} />;
        }
        if (line.trim() === '---') {
          return <hr key={i} style={{ border: 'none', borderTop: '1px solid #1e1e1e', margin: '16px 0' }} />;
        }
        if (line.startsWith('## ')) {
          let headerText = line.substring(3).trim();
          const emojiMatch = headerText.match(/^[\p{Emoji}\u200d]+\s*/u);
          if (emojiMatch) {
            headerText = headerText.substring(emojiMatch[0].length);
          }
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
          <div key={i} style={{
            color: '#b8b0a4', fontSize: '12.5px', lineHeight: '1.85', marginBottom: '4px'
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
    
    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const snippets = CODE_SNIPPETS.map(text => ({
      text,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 0.6 + Math.random() * 0.9,
      opacity: 0.12 + Math.random() * 0.20
    }));

    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "12px 'JetBrains Mono', monospace";
      
      snippets.forEach(snippet => {
        snippet.y -= snippet.speed;
        snippet.x += Math.sin(snippet.y * 0.01) * 0.5;

        if (snippet.y < -20) {
          snippet.y = canvas.height + 20;
          snippet.x = Math.random() * canvas.width;
        }

        ctx.fillStyle = `rgba(232, 197, 71, ${snippet.opacity})`;
        ctx.fillText(snippet.text, snippet.x, snippet.y);
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrameId);
    };
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
        <div style={{ color: '#444', fontSize: '10px', letterSpacing: '0.25em' }}>
          REFINING PROMPT...
        </div>
      </div>
    </div>
  );
}

export default function Promptify() {
  const [rawPrompt, setRawPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [category, setCategory] = useState("Web App");
  const [model, setModel] = useState(MODELS[0]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  
  const bgCanvasRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
      
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: #0c0c0c; font-family: 'JetBrains Mono', monospace; }
      textarea:focus, input:focus { outline: none; border-color: #333 !important; }
      textarea::placeholder, input::placeholder { color: #333; }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: #0e0e0e; }
      ::-webkit-scrollbar-thumb { background: #2a2a2a; }
      button:active { transform: scale(0.99); }
      
      @keyframes sweep {
        0%   { left: -60%; width: 60%; }
        100% { left: 110%; width: 60%; }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
      .loading-bar {
        position: absolute;
        height: 100%;
        width: 40%;
        background: linear-gradient(90deg, transparent, #e8c547, transparent);
        animation: sweep 1.4s ease-in-out infinite;
        left: -40%;
      }
    `;
    document.head.appendChild(style);
    
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const snippets = CODE_SNIPPETS.map(text => ({
      text,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 0.08 + Math.random() * 0.12,
      opacity: 0.02 + Math.random() * 0.03
    }));

    let animationFrameId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "14px 'JetBrains Mono', monospace";
      
      snippets.forEach(snippet => {
        snippet.y -= snippet.speed;
        snippet.x += Math.sin(snippet.y * 0.005) * 0.2;

        if (snippet.y < -20) {
          snippet.y = canvas.height + 20;
          snippet.x = Math.random() * canvas.width;
        }

        ctx.fillStyle = `rgba(232, 197, 71, ${snippet.opacity})`;
        ctx.fillText(snippet.text, snippet.x, snippet.y);
      });
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();

    
    
    return () => {
      document.head.removeChild(style);
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  const generatePrompt = async () => {
    if (!rawPrompt.trim()) return;
    
    setLoading(true);
    setError("");
    setOutput("");
    
    try {
      let resultText = "";
      
      if (model.provider === "anthropic") {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: model.id,
            max_tokens: 1000,
            system: buildSystemPrompt(category),
            messages: [{ role: "user", content: rawPrompt }]
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "Anthropic Error");
        resultText = data.content?.[0]?.text || "";
        
      } else if (model.provider === "groq") {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY
          },
          body: JSON.stringify({
            model: model.id,
            max_tokens: 1000,
            messages: [
              { role: "system", content: buildSystemPrompt(category) },
              { role: "user", content: rawPrompt }
            ]
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "Groq Error");
        resultText = data.choices?.[0]?.message?.content || "";
        
      } else if (model.provider === "gemini") {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: buildSystemPrompt(category) }] },
            contents: [{ parts: [{ text: rawPrompt }] }]
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "Gemini Error");
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      
      setOutput(resultText);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <canvas ref={bgCanvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }} />
      
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1160px', margin: '0 auto', padding: '32px 28px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <div style={{ color: '#f0e8d8', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
            PROMPTIFY <span style={{ color: '#e8c547', fontSize: '10px', marginLeft: '8px', verticalAlign: 'middle' }}>v1.0</span>
          </div>
          <div style={{ color: model.accent, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {model.name}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', flex: 1 }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#3a3a3a' }}>RAW INPUT</div>
                <div style={{ fontSize: '9px', color: '#3a3a3a' }}>{rawPrompt.length}</div>
              </div>
              <textarea
                value={rawPrompt}
                onChange={(e) => setRawPrompt(e.target.value)}
                placeholder={"dump your rough idea here...\n\nno structure needed, just type what\nyou want to build or do"}
                style={{
                  width: '100%', height: '170px', background: '#0e0e0e', border: '1px solid #1c1c1c',
                  color: '#d8d0c4', fontSize: '13px', lineHeight: '1.75', padding: '16px',
                  resize: 'none', borderRadius: '0', fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#3a3a3a', marginBottom: '12px' }}>PROJECT CATEGORY</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {CATEGORIES.map(cat => {
                  const isActive = category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      style={{
                        background: isActive ? '#1e1a06' : 'transparent',
                        border: `1px solid ${isActive ? '#e8c547' : '#1e1e1e'}`,
                        color: isActive ? '#e8c547' : '#3e3e3e',
                        padding: '6px 12px', fontSize: '11px', cursor: 'pointer', borderRadius: '0',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                      onMouseOver={(e) => {
                        if (!isActive) { e.target.style.borderColor = '#333'; e.target.style.color = '#999'; }
                      }}
                      onMouseOut={(e) => {
                        if (!isActive) { e.target.style.borderColor = '#1e1e1e'; e.target.style.color = '#3e3e3e'; }
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#3a3a3a', marginBottom: '12px' }}>AI MODEL</div>
              
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#111', border: '1px solid #282828', color: '#f0e8d8',
                  padding: '12px 16px', fontSize: '12px', cursor: 'pointer', borderRadius: '0',
                  fontFamily: 'inherit'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '6px', height: '6px', background: model.accent }} />
                  {model.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: model.dimBg, color: model.accent, fontSize: '9px', padding: '2px 6px', letterSpacing: '0.1em' }}>
                    {model.tag}
                  </div>
                  <div style={{ color: '#555', fontSize: '10px' }}>▼</div>
                </div>
              </button>

              {modelDropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: '#0a0a0a', border: '1px solid #1c1c1c', zIndex: 10,
                  display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px'
                }}>
                  {MODELS.map(m => {
                    const isActive = model.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setModel(m);
                          setModelDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: isActive ? '#141414' : 'transparent',
                          border: 'none', color: isActive ? '#f0e8d8' : '#888',
                          padding: '10px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '0',
                          fontFamily: 'inherit', textAlign: 'left'
                        }}
                        onMouseOver={(e) => {
                          if (!isActive) { e.target.style.background = '#111'; e.target.style.color = '#ccc'; }
                        }}
                        onMouseOut={(e) => {
                          if (!isActive) { e.target.style.background = 'transparent'; e.target.style.color = '#888'; }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '6px', height: '6px', background: isActive ? m.accent : 'transparent', border: isActive ? 'none' : '1px solid #333' }} />
                          {m.name}
                        </div>
                        <div style={{
                          background: m.dimBg, color: m.accent, fontSize: '9px', padding: '2px 6px',
                          letterSpacing: '0.1em', opacity: isActive ? 1 : 0.6
                        }}>
                          {m.tag}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>



            <button
              onClick={generatePrompt}
              disabled={!rawPrompt.trim() || loading}
              style={{
                width: '100%', height: '56px',
                background: loading ? 'rgba(232, 197, 71, 0.7)' : (!rawPrompt.trim() ? '#1a1a0e' : '#e8c547'),
                color: !rawPrompt.trim() ? '#2a2808' : '#0c0c0c',
                fontWeight: '700', letterSpacing: '0.2em', fontSize: '12px',
                border: 'none', cursor: (!rawPrompt.trim() || loading) ? 'not-allowed' : 'pointer',
                borderRadius: '0', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: '16px'
              }}
            >
              {loading ? (
                <span><span style={{ animation: 'blink 1s infinite' }}>_</span> REFINING PROMPT</span>
              ) : (
                "REFINE PROMPT →"
              )}
            </button>

            {error && (
              <div style={{ background: '#100808', border: '1px solid #2a0e0e', padding: '10px 14px', color: '#c04040', fontSize: '10px' }}>
                ! {error}
              </div>
            )}

          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px', minHeight: '18px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#3a3a3a' }}>STRUCTURED OUTPUT</div>
              {output && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '9px', color: '#2a2a2a' }}>{output.length} CHARS</div>
                  <button
                    onClick={handleCopy}
                    style={{
                      background: 'transparent', border: '1px solid #222', color: '#555',
                      padding: '4px 8px', fontSize: '9px', cursor: 'pointer', borderRadius: '0',
                      fontFamily: 'inherit'
                    }}
                  >
                    {copied ? "COPIED ✓" : "COPY"}
                  </button>
                </div>
              )}
            </div>

            <div style={{
              border: '1px solid #161616', background: '#090909', minHeight: '560px',
              display: 'flex', flexDirection: 'column', position: 'relative'
            }}>
              {loading ? (
                <LoadingBubbles />
              ) : output ? (
                <div style={{ overflowY: 'auto', maxHeight: '600px', flex: 1 }}>
                  <SimpleMarkdown text={output} />
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#1e1e1e', letterSpacing: '0.1em' }}>// AWAITING INPUT</div>
                  <div style={{ width: '1px', height: '32px', background: '#141414', margin: '16px 0' }} />
                  <div style={{ fontSize: '9px', color: '#1a1a1a', letterSpacing: '0.05em' }}>STRUCTURED PROMPT WILL APPEAR HERE</div>
                </div>
              )}
            </div>

            {!output && !loading && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                {[
                  { label: "ROLE", text: "AI defines who it is" },
                  { label: "TASK", text: "precise objective" },
                  { label: "HINTS", text: "smallest details" },
                  { label: "CRITERIA", text: "success metrics" }
                ].map((hint, i) => (
                  <div key={i} style={{ background: '#0a0a0a', border: '1px solid #141414', padding: '10px 14px' }}>
                    <div style={{ fontSize: '8px', color: '#e8c547', letterSpacing: '0.2em', marginBottom: '6px' }}>{hint.label}</div>
                    <div style={{ fontSize: '10px', color: '#2a2a2a' }}>{hint.text}</div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

        <footer style={{
          display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #141414',
          marginTop: '60px', paddingTop: '20px'
        }}>
          <div style={{ fontSize: '9px', color: '#1e1e1e', letterSpacing: '0.1em' }}>PROMPTIFY — RAW TO STRUCTURED</div>
          <div style={{ fontSize: '9px', color: '#1e1e1e', letterSpacing: '0.1em' }}>CLAUDE · LLAMA · GEMMA</div>
        </footer>

      </div>
    </>
  );
}
