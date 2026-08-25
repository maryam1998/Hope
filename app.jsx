import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Star, MessageCircle, RotateCcw, Repeat, Send, Check, X, BookOpen, Heart, Search, Volume2, VolumeX, Newspaper, Sparkles, Plus, LogOut, Mail, Lock, User, UserPlus, LogIn, Loader2, Bookmark, Pause, Play, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil, Wand2, Menu, Palette, Type, Trash2, PlayCircle, Gauge, Layers, Blend, Coffee, CheckSquare, Copy, Globe, SkipBack, SkipForward, ListMusic, Square, ListChecks, Mic } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { VOCAB } from "./VOCAB.js";
import { WORDS_AZ } from "./WORDS_AZ.js";
import { NEWS_WORDS } from "./NEWS_WORDS.js";
import { DAILY_WORDS } from "./DAILY_WORDS.js";
import { SLANG_WORDS } from "./SLANG_WORDS.js";
import { DAILY_CONVERSATIONS } from "./DAILY_CONVERSATIONS.js";
import DailyConversationsTab from "./DailyConversationsTab.jsx";
import RangeSliderFilter from "./RangeSliderFilter.jsx";

// ============================================================
// تعیین زبان و جهت نوشتاری
// ============================================================
function detectLanguageAndDirection(text) {
  // الگوی فارسی
  const farsiPattern = /[\u0600-\u06FF]/;
  // الگوی عربی
  const arabicPattern = /[\u0600-\u06FF]/;
  
  if (farsiPattern.test(text) || arabicPattern.test(text)) {
    return { direction: 'rtl', language: 'fa' };
  }
  return { direction: 'ltr', language: 'en' };
}

// ============================================================
// کامپوننت مودال برای نمایش اطلاعات کلمه
// ============================================================
function WordModal({ word, translation, onClose, onAddToStory, onAddToGrammar, onAddToHighlight }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}>
      <div style={{
        backgroundColor: '#f5f0e8',
        borderRadius: 12,
        padding: 24,
        minWidth: 300,
        maxWidth: 400,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#2c3e50' }}>{word}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>
            ✕
          </button>
        </div>
        
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fff', borderRadius: 8, borderLeft: '3px solid #c4a747' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>ترجمه</p>
          <p style={{ margin: 0, fontSize: 16, color: '#2c3e50' }}>{translation || 'در حال لود...'}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onAddToStory}
            style={{
              padding: '10px 16px',
              backgroundColor: '#c4a747',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#b39633'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#c4a747'}
          >
            افزودن به داستان بعدی
          </button>
          
          <button
            onClick={onAddToGrammar}
            style={{
              padding: '10px 16px',
              backgroundColor: '#5a9b8f',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#4a8b7f'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#5a9b8f'}
          >
            افزودن به یادگیری گرامر
          </button>

          <button
            onClick={onAddToHighlight}
            style={{
              padding: '10px 16px',
              backgroundColor: '#d9a336',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c99326'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#d9a336'}
          >
            هایلایت و افزودن
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// کامپوننت متن با قابلیت انتخاب کلمات
// ============================================================
function SelectableText({ text, onWordClick }) {
  const langDir = detectLanguageAndDirection(text);
  const words = text.split(/(\s+)/); // تقسیم متن اما حفظ فاصله‌ها

  return (
    <div
      style={{
        direction: langDir.direction,
        textAlign: langDir.direction === 'rtl' ? 'right' : 'left',
        lineHeight: 1.8,
        userSelect: 'none',
      }}
    >
      {words.map((word, idx) => {
        // فاصله‌ها (Whitespace) را به‌عنوان متن عادی رندر کن
        if (/^\s+$/.test(word)) {
          return <span key={idx}>{word}</span>;
        }

        return (
          <span
            key={idx}
            onClick={() => onWordClick(word.replace(/[^\w\s]/g, ''))} // حذف نقل‌قول‌ها و علائم تعجب
            style={{
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 3,
              transition: 'background-color 0.2s',
              color: langDir.language === 'fa' ? '#2c3e50' : '#d9a336',
              fontWeight: langDir.language === 'fa' ? 400 : 600,
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(212, 167, 71, 0.2)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

// ============================================================
// کامپوننت قسمت متن اصلی (اصلاح شده)
// ============================================================
function OriginalTextSection({ storyData, onWordClick }) {
  if (!storyData || !storyData.text) {
    return <div style={{ padding: 16, color: '#999' }}>بدون متن</div>;
  }

  return (
    <div style={{
      backgroundColor: '#f5f0e8',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#666', textAlign: 'right' }}>
        بستن متن اصلی
      </h3>
      <SelectableText text={storyData.text} onWordClick={onWordClick} />
    </div>
  );
}

// ============================================================
// قسمت داستان‌های ذخیره‌شده با پشتیبانی PDF
// ============================================================
function SavedStoriesSection({ savedStories, onLoadStory, onDeleteStory }) {
  return (
    <div style={{
      backgroundColor: '#fafbfc',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#666', textAlign: 'right' }}>
        داستانهای ذخیره‌شده
      </h3>
      
      {savedStories && savedStories.length > 0 ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {savedStories.map((story, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#fff',
                border: '1px solid #e0d9cc',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fefaf3'}
            >
              <div onClick={() => onLoadStory(story)} style={{ flex: 1, cursor: 'pointer' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600, color: '#2c3e50' }}>
                  {story.title || `داستان ${idx + 1}`}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#999' }}>
                  {story.isPDF ? '📄 PDF' : '📝 متن'} • {story.words?.length || 0} کلمه
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteStory(idx);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#d9534f',
                  padding: 8,
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: '#999', textAlign: 'right' }}>
          هنوز داستان‌ای ذخیره‌نشده
        </p>
      )}
    </div>
  );
}

// ============================================================
// تابع ترجمه (ساده‌شده برای مثال)
// ============================================================
async function translateWord(word, targetLang = 'fa') {
  // اینجا می‌تونید به یک API ترجمه متصل شید
  // برای حالا، یه دیکشنری ساده استفاده می‌کنیم
  const mockDictionary = {
    'home': 'خانه',
    'lived': 'زندگی می‌کردند',
    'river': 'رودخانه',
    'trees': 'درختان',
    'pond': 'تالاب',
    'words': 'کلمات',
    'horse': 'اسب',
    'good': 'خوب',
  };
  
  return mockDictionary[word.toLowerCase()] || `(ترجمه برای "${word}" یافت نشد)`;
}

// ============================================================
// کامپوننت اصلی اپلیکیشن
// ============================================================
export default function StoryReaderApp() {
  const [savedStories, setSavedStories] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordTranslation, setWordTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStory, setCurrentStory] = useState({
    text: "I remember it I 2 like first my home. It was a big field with a pond. There a small river with trees and grass. My mother lived I. I was older when I ate at the grass. My mother stayed by her and drank milk. There six other horses. My mother went to work in the day. We played and ran fast. Do not bite or kick me. My mother told me. Our master1 was a horse. Be good a horse remember I. His name us to nice was and food us gave He. A good kind man, One. He gave me bread. black was I because 'Darkie' was me for. He saw him. Our. us at stones throw boy bad a, day and master our with safe were We. away boy the sent and angry.",
    isPDF: false,
    title: 'بیست من اصلی',
  });

  // هنگامی که کاربر روی کلمه کلیک می‌کند
  const handleWordClick = useCallback(async (word) => {
    if (!word || word.length === 0) return;
    
    setSelectedWord(word);
    setLoading(true);
    
    try {
      const translation = await translateWord(word);
      setWordTranslation(translation);
    } catch (error) {
      setWordTranslation('خطا در ترجمه');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddToStory = () => {
    alert(`"${selectedWord}" به داستان بعدی اضافه شد`);
    setSelectedWord(null);
  };

  const handleAddToGrammar = () => {
    alert(`"${selectedWord}" به بخش گرامر اضافه شد`);
    setSelectedWord(null);
  };

  const handleAddToHighlight = () => {
    alert(`"${selectedWord}" هایلایت شد`);
    setSelectedWord(null);
  };

  const handleSaveStory = () => {
    const newStory = {
      ...currentStory,
      savedAt: new Date().toISOString(),
    };
    setSavedStories([...savedStories, newStory]);
    alert('داستان ذخیره شد');
  };

  const handleLoadStory = (story) => {
    setCurrentStory(story);
  };

  const handleDeleteStory = (idx) => {
    setSavedStories(savedStories.filter((_, i) => i !== idx));
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fafbfc',
      fontFamily: 'Arial, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#2c3e50',
        color: '#fff',
        padding: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          📚 داستان‌خوان
        </h1>
        <button
          onClick={handleSaveStory}
          style={{
            backgroundColor: '#c4a747',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          ذخیره داستان
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 16,
      }}>
        {/* داستان‌های ذخیره‌شده */}
        <SavedStoriesSection
          savedStories={savedStories}
          onLoadStory={handleLoadStory}
          onDeleteStory={handleDeleteStory}
        />

        {/* متن اصلی */}
        <OriginalTextSection
          storyData={currentStory}
          onWordClick={handleWordClick}
        />

        {/* Translation Panel */}
        {wordTranslation && !selectedWord && (
          <div style={{
            backgroundColor: '#fff8f0',
            borderLeft: '4px solid #c4a747',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}>
            <p style={{ margin: 0, fontSize: 14, color: '#2c3e50' }}>
              <strong>ترجمه:</strong> {wordTranslation}
            </p>
          </div>
        )}
      </div>

      {/* Word Modal */}
      {selectedWord && (
        <WordModal
          word={selectedWord}
          translation={loading ? 'در حال بارگذاری...' : wordTranslation}
          onClose={() => setSelectedWord(null)}
          onAddToStory={handleAddToStory}
          onAddToGrammar={handleAddToGrammar}
          onAddToHighlight={handleAddToHighlight}
        />
      )}
    </div>
  );
}
