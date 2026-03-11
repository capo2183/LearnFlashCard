import { useState, useEffect } from 'react';
import { getAllCards, updateCardProgress } from './googleService';
import { calculateSM2 } from './sm2';
import './StudyView.css';

const StudyView = ({ spreadsheetId, onBack }) => {
    const [reviewQueue, setReviewQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sessionComplete, setSessionComplete] = useState(false);

    useEffect(() => {
        fetchDueCards();
    }, [spreadsheetId]);

    const fetchDueCards = async () => {
        setLoading(true);
        const all = await getAllCards(spreadsheetId);
        console.log("從雲端讀取到的所有卡片:", all);
        
        const now = new Date();
        const due = all.filter(card => {
            if (!card.nextReviewDate) return true; // 沒設定日期的視為到期
            const nextDate = new Date(card.nextReviewDate);
            // 如果解析失敗也視為到期
            if (isNaN(nextDate)) return true;
            return nextDate <= now;
        });
        
        console.log("今日需複習的數量:", due.length);
        
        // Shuffle cards for better learning
        setReviewQueue(due.sort(() => Math.random() - 0.5));
        setLoading(false);
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleFeedback = async (quality) => {
        const card = reviewQueue[currentIndex];
        
        // 1. Calculate new values via SM-2
        const newState = calculateSM2(
            quality, 
            card.interval, 
            card.repetition, 
            card.efactor
        );

        // 2. Update Cloud
        try {
            await updateCardProgress(spreadsheetId, card.rowIndex, newState);
        } catch (err) {
            console.error("Save Progress Error:", err);
        }

        // 3. Move to next card
        if (currentIndex < reviewQueue.length - 1) {
            setIsFlipped(false);
            setCurrentIndex(currentIndex + 1);
        } else {
            setSessionComplete(true);
        }
    };

    if (loading) return <div className="study-container"><p>載入複習計畫中...</p></div>;
    
    if (sessionComplete) {
        return (
            <div className="study-container animate-fade-in">
                <div className="glass-panel complete-card">
                    <h1>🎉 複習完成！</h1>
                    <p>今天所有的單字都已經複習完畢，做的好！</p>
                    <button className="primary-btn" onClick={onBack}>返回儀表板</button>
                </div>
            </div>
        );
    }

    if (reviewQueue.length === 0) {
        return (
            <div className="study-container animate-fade-in">
                <div className="glass-panel complete-card">
                    <h1>現在沒有需要複習的單字</h1>
                    <p>您可以去「管理單字卡」新增更多內容，或是等明天再回來。</p>
                    <button className="primary-btn" onClick={onBack}>返回儀表板</button>
                </div>
            </div>
        );
    }

    const currentCard = reviewQueue[currentIndex];

    return (
        <div className="study-container animate-fade-in">
            <div className="study-header">
                <button className="small-back-btn" onClick={onBack}>離開</button>
                <div className="progress-bar">
                    <div 
                        className="progress-inner" 
                        style={{ width: `${((currentIndex + 1) / reviewQueue.length) * 100}%` }}
                    ></div>
                    <span>{currentIndex + 1} / {reviewQueue.length}</span>
                </div>
            </div>

            <div className={`flip-card-container ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
                <div className="flip-card-inner">
                    <div className="flip-card-front glass-panel">
                        <div className="card-label">單字</div>
                        <div className="card-text">{currentCard.front || "內容為空"}</div>
                        <div className="tap-hint">點擊翻面</div>
                    </div>
                    <div className="flip-card-back glass-panel">
                        <div className="card-label">解釋</div>
                        <div className="card-text">{currentCard.back || "內容為空"}</div>
                    </div>
                </div>
            </div>

            {isFlipped && (
                <div className="feedback-section animate-fade-in">
                    <p>您對這個單字的熟悉程度？</p>
                    <div className="feedback-buttons">
                        <button className="fb-btn again" onClick={() => handleFeedback(0)}>忘了</button>
                        <button className="fb-btn hard" onClick={() => handleFeedback(3)}>艱難</button>
                        <button className="fb-btn good" onClick={() => handleFeedback(4)}>不錯</button>
                        <button className="fb-btn easy" onClick={() => handleFeedback(5)}>簡單</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyView;
