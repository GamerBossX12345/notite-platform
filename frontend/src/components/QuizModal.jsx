// Quiz Generator Modal
import { useState } from 'react';
import { api } from '../api/client.js';
import { X } from 'lucide-react';

export function QuizModal({ noteId, isOpen, onClose }) {
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
      setError(err.response?.data?.error || 'Eroare la generarea quiz-ului');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (qId, answer) => {
    setSelectedAnswers({ ...selectedAnswers, [qId]: answer });
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    let correct = 0;
    quiz.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        width: '90%',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <X size={24} />
        </button>

        <h2>📝 Quiz Generator</h2>

        {!quiz ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              Generează o întrebare pe baza conținutului notei folosind AI
            </p>
            <button
              onClick={generateQuiz}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              {loading ? 'Se generează...' : 'Generează Quiz'}
            </button>
            {error && <p style={{ color: '#d32f2f', marginTop: '12px' }}>❌ {error}</p>}
          </div>
        ) : showResults ? (
          <div>
            <h3>📊 Rezultatele Tale</h3>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              textAlign: 'center',
              color: calculateScore() >= 60 ? '#4caf50' : '#d32f2f',
              margin: '24px 0',
            }}>
              {calculateScore()}%
            </div>
            <p style={{ textAlign: 'center', marginBottom: '24px' }}>
              {calculateScore() >= 80 && '🎉 Excelent! Bun-venit pe podium!'}
              {calculateScore() >= 60 && calculateScore() < 80 && '👍 Bine! Continuă să studiezi.'}
              {calculateScore() < 60 && '💪 Mai poți face mai bine. Revizuiește conținutul!'}
            </p>

            <div style={{ marginBottom: '24px' }}>
              {quiz.questions.map((q, idx) => {
                const isCorrect = selectedAnswers[q.id] === q.correctAnswer;
                return (
                  <div key={q.id} style={{
                    padding: '12px',
                    marginBottom: '12px',
                    backgroundColor: isCorrect ? '#e8f5e9' : '#ffebee',
                    borderRadius: '4px',
                    borderLeft: `4px solid ${isCorrect ? '#4caf50' : '#d32f2f'}`,
                  }}>
                    <p><strong>{idx + 1}. {q.question}</strong></p>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                      Ta răspuns: <strong>{selectedAnswers[q.id]}</strong>
                      {!isCorrect && <span> (Corect: {q.correctAnswer})</span>}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setQuiz(null)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Generează alt quiz
            </button>
          </div>
        ) : (
          <div>
            <h3>Răspunde la întrebări:</h3>
            <div style={{ marginBottom: '24px' }}>
              {quiz.questions.map((q, idx) => (
                <div key={q.id} style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #eee' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '12px' }}>
                    {idx + 1}. {q.question}
                  </p>
                  {q.options?.map((option, oIdx) => (
                    <label key={oIdx} style={{
                      display: 'block',
                      padding: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedAnswers[q.id] === option ? '#e3f2fd' : 'transparent',
                      borderRadius: '4px',
                    }}>
                      <input
                        type="radio"
                        name={`q${q.id}`}
                        value={option}
                        checked={selectedAnswers[q.id] === option}
                        onChange={() => handleAnswerSelect(q.id, option)}
                        style={{ marginRight: '8px' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length !== quiz.questions.length}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: Object.keys(selectedAnswers).length !== quiz.questions.length ? 0.6 : 1,
              }}
            >
              Trimite Răspunsuri
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
