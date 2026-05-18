// Quiz Generator Modal
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';

export function QuizModal({ noteId, isOpen, onClose }) {
  const { darkMode } = useAuth();
  const { t } = useTranslation();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const generateQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/notes/${noteId}/quiz`);
      setQuiz(response.data);
      setSelectedAnswers({});
      setShowResults(false);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (qId, answer) => {
    setSelectedAnswers({ ...selectedAnswers, [qId]: answer });
  };

  const handleSubmit = () => setShowResults(true);

  // AI returns correctAnswer ca literă ("A") iar opțiunile sunt strings de forma "A) Text".
  // Comparam pe litera de început, normalizat (case-insensitive).
  const letterOf = (s) => s?.toString().match(/^\s*([A-D])/i)?.[1]?.toUpperCase() || null;

  const isAnswerCorrect = (selected, correctAnswer) => {
    if (!selected || !correctAnswer) return false;
    if (/^[A-D]$/i.test(correctAnswer.trim())) {
      return letterOf(selected) === correctAnswer.trim().toUpperCase();
    }
    return selected === correctAnswer;
  };

  const fullCorrectOption = (q) => {
    if (/^[A-D]$/i.test(q.correctAnswer?.trim())) {
      const target = q.correctAnswer.trim().toUpperCase();
      return q.options?.find(opt => letterOf(opt) === target) || q.correctAnswer;
    }
    return q.correctAnswer;
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    let correct = 0;
    quiz.questions.forEach((q) => {
      if (isAnswerCorrect(selectedAnswers[q.id], q.correctAnswer)) correct++;
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  if (!isOpen) return null;

  const muted = darkMode ? '#a89bc4' : '#666';
  const border = darkMode ? 'rgba(168, 85, 247, 0.45)' : '#e0e0e0';

  return (
    <div style={overlayStyle}>
      <div style={modalStyle(darkMode)}>
        <button onClick={onClose} style={closeBtnStyle(darkMode)} aria-label={t('common.close')}>
          <X size={22} />
        </button>

        <h2 style={{ margin: '0 0 16px', color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>📝 {t('ai.quizTitle')}</h2>

        {!quiz ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <button onClick={generateQuiz} disabled={loading} style={primaryBtnStyle(darkMode)}>
              {loading ? t('ai.quizLoading') : t('note.generateQuiz')}
            </button>
            {error && <p style={{ color: '#ef4444', marginTop: 12 }}>❌ {error}</p>}
          </div>
        ) : showResults ? (
          <div>
            <h3 style={{ color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>📊 {t('ai.quizScore', { correct: 0, total: quiz.questions.length }).split(':')[0]}</h3>
            <div style={{
              fontSize: 48, fontWeight: 'bold', textAlign: 'center',
              color: calculateScore() >= 60 ? '#22c55e' : '#ef4444',
              margin: '24px 0',
            }}>
              {calculateScore()}%
            </div>

            <div style={{ marginBottom: 24 }}>
              {quiz.questions.map((q, idx) => {
                const isCorrect = isAnswerCorrect(selectedAnswers[q.id], q.correctAnswer);
                return (
                  <div key={q.id} style={resultRowStyle(darkMode, isCorrect)}>
                    <p style={{ margin: 0 }}><strong>{idx + 1}. {q.question}</strong></p>
                    <p style={{ fontSize: 13, color: muted, margin: '6px 0 0' }}>
                      {isCorrect ? '✓ ' + t('ai.quizCorrect') : '✗ ' + t('ai.quizIncorrect')}: <strong>{selectedAnswers[q.id]}</strong>
                      {!isCorrect && <span> ({fullCorrectOption(q)})</span>}
                    </p>
                  </div>
                );
              })}
            </div>

            <button onClick={() => setQuiz(null)} style={{ ...primaryBtnStyle(darkMode), width: '100%' }}>
              {t('ai.quizRetry')}
            </button>
          </div>
        ) : (
          <div>
            <h3 style={{ color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>{t('ai.quizTitle')}</h3>
            <div style={{ marginBottom: 24 }}>
              {quiz.questions.map((q, idx) => (
                <div key={q.id} style={{ marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${border}` }}>
                  <p style={{ fontWeight: 'bold', marginBottom: 12 }}>
                    {t('ai.quizQuestion', { n: idx + 1, total: quiz.questions.length })}: {q.question}
                  </p>
                  {q.options?.map((option, oIdx) => {
                    const checked = selectedAnswers[q.id] === option;
                    return (
                      <label key={oIdx} style={optionStyle(darkMode, checked)}>
                        <input
                          type="radio"
                          name={`q${q.id}`}
                          value={option}
                          checked={checked}
                          onChange={() => handleAnswerSelect(q.id, option)}
                          style={{ marginRight: 8, accentColor: '#a855f7' }}
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length !== quiz.questions.length}
              style={{
                ...successBtnStyle(darkMode),
                width: '100%',
                opacity: Object.keys(selectedAnswers).length !== quiz.questions.length ? 0.5 : 1,
              }}
            >
              {t('ai.quizSubmit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)',
};

const modalStyle = (darkMode) => ({
  background: darkMode ? 'rgba(20, 8, 50, 0.97)' : '#fff',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ddd',
  borderRadius: 12,
  padding: 24,
  maxWidth: 600,
  maxHeight: '90vh',
  overflowY: 'auto',
  width: '90%',
  position: 'relative',
  color: darkMode ? '#e8e0ff' : '#222',
  boxShadow: darkMode
    ? '0 20px 60px rgba(120, 40, 200, 0.4)'
    : '0 20px 60px rgba(0,0,0,0.2)',
  backdropFilter: 'blur(14px)',
});

const closeBtnStyle = (darkMode) => ({
  position: 'absolute', top: 12, right: 12,
  width: 32, height: 32,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: darkMode ? 'rgba(120, 40, 200, 0.15)' : '#f3f4f6',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #e0e0e0',
  color: darkMode ? '#c9a8ff' : '#555',
  borderRadius: 6, cursor: 'pointer',
  transition: 'background 0.2s ease, border-color 0.2s ease',
});

const primaryBtnStyle = (darkMode) => ({
  padding: '10px 22px',
  background: darkMode ? 'transparent' : '#0066cc',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #0066cc',
  color: darkMode ? '#c9a8ff' : 'white',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 15,
  fontWeight: 600,
  transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
});

const successBtnStyle = (darkMode) => ({
  padding: '12px',
  background: darkMode ? 'rgba(34, 197, 94, 0.18)' : '#22c55e',
  border: darkMode ? '1px solid rgba(34, 197, 94, 0.6)' : '1px solid #22c55e',
  color: darkMode ? '#86efac' : 'white',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 15,
  fontWeight: 600,
});

const optionStyle = (darkMode, checked) => ({
  display: 'block',
  padding: '10px 12px',
  marginBottom: 8,
  cursor: 'pointer',
  border: checked
    ? '1px solid rgba(168, 85, 247, 0.6)'
    : (darkMode ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid #e0e0e0'),
  background: checked
    ? (darkMode ? 'rgba(120, 40, 200, 0.2)' : '#e3f2fd')
    : 'transparent',
  borderRadius: 6,
  transition: 'background 0.2s ease, border-color 0.2s ease',
});

const resultRowStyle = (darkMode, correct) => ({
  padding: '10px 12px',
  marginBottom: 10,
  background: correct
    ? (darkMode ? 'rgba(34, 197, 94, 0.12)' : '#e8f5e9')
    : (darkMode ? 'rgba(239, 68, 68, 0.12)' : '#ffebee'),
  borderRadius: 6,
  borderLeft: `4px solid ${correct ? '#22c55e' : '#ef4444'}`,
});
