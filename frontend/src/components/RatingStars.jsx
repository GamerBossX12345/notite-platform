// Componenta Rating - 1-5 stars clickabile
import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

export function RatingStars({ noteId, currentRating = 0, onRate }) {
  const [hovered, setHovered] = useState(0);
  const [rating, setRating] = useState(currentRating);

  useEffect(() => {
    setRating(currentRating);
  }, [currentRating]);

  const handleClick = (value) => {
    setRating(value);
    if (onRate) onRate(value);
  };

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleClick(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          title={`${star} stele`}
        >
          <Star
            size={24}
            fill={star <= (hovered || rating) ? '#ffc107' : 'none'}
            stroke={star <= (hovered || rating) ? '#ffc107' : '#ddd'}
            style={{ transition: 'all 0.2s' }}
          />
        </button>
      ))}
      <span style={{ marginLeft: '8px', fontSize: '14px', color: '#666' }}>
        {rating > 0 ? `${rating}/5` : 'Fără rating'}
      </span>
    </div>
  );
}

// Versiune read-only pentru display
export function RatingStarsDisplay({ rating, count }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={20}
          fill={star <= Math.round(rating) ? '#ffc107' : 'none'}
          stroke={star <= Math.round(rating) ? '#ffc107' : '#ddd'}
        />
      ))}
      <span style={{ marginLeft: '8px', fontSize: '14px', color: '#666' }}>
        {rating.toFixed(1)}/5 ({count} voturi)
      </span>
    </div>
  );
}
